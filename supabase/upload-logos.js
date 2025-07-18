import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

console.log('Using Supabase URL:', process.env.SUPABASE_URL);

// Configuration
const CONFIG = {
    batchSize: 100,
    logoBatchSize: 5,
    retryAttempts: 3,
    retryDelay: 1000,
    requestTimeout: 15000,
    logoFormats: ['png', 'jpg', 'jpeg', 'webp'],
    fallbackStrategies: true
};

// Helper functions
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOperation(operation, maxAttempts = CONFIG.retryAttempts) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxAttempts) throw error;
            console.log(`Attempt ${attempt} failed, retrying...`);
            await sleep(CONFIG.retryDelay * attempt);
        }
    }
}

async function createStorageBucketIfNeeded() {
    if (!process.env.SUPABASE_SERVICE_KEY) {
        console.log('Note: Using anon key. Please ensure "company-logos" bucket exists in Supabase');
        console.log('Required settings: Public access, allowed MIME types: image/png, image/jpeg, image/webp');
        return true;
    }

    try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) throw listError;

        const exists = buckets.some(b => b.name === 'company-logos');
        if (!exists) {
            console.log('Creating company-logos bucket...');
            const { error } = await supabase.storage.createBucket('company-logos', {
                public: true,
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
                fileSizeLimit: 5242880 // 5MB
            });
            if (error) throw error;
            console.log('✓ Created company-logos bucket');
        } else {
            console.log('✓ company-logos bucket already exists');
        }
        return true;
    } catch (error) {
        console.error('Bucket setup error:', error.message);
        return false;
    }
}

async function uploadMappingsToSupabase() {
    try {
        const csvPath = path.join(__dirname, 'company_mappings.csv');
        const fileContent = await fs.readFile(csvPath, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });

        if (records.length === 0) {
            console.error('Error: company_mappings.csv is empty or contains only headers');
            return false;
        }

        console.log(`Found ${records.length} mappings to upload`);
        
        // Show summary
        const statusCounts = records.reduce((acc, r) => {
            acc[r.match_status] = (acc[r.match_status] || 0) + 1;
            return acc;
        }, {});
        console.log('Mapping summary:', statusCounts);

        const mappings = records.map(record => ({
            company_id: parseInt(record.company_id),
            company_name: record.company_name,
            tsx_code: record.tsx_code || null,
            goldstock_id: record.goldstock_id || null,
            goldstock_name: record.goldstock_name || null,
            match_status: record.match_status,
            confidence_score: parseFloat(record.confidence_score) || 0,
            match_method: record.match_method || null
        }));

        // Upsert mappings in batches
        const batchSize = CONFIG.batchSize;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < mappings.length; i += batchSize) {
            const batch = mappings.slice(i, i + batchSize);
            try {
                const { data, error } = await retryOperation(async () => 
                    supabase
                        .from('company_goldstock_mapping')
                        .upsert(batch, { 
                            onConflict: 'company_id',
                            ignoreDuplicates: false 
                        })
                );
                
                if (error) throw error;
                successCount += batch.length;
                console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(mappings.length / batchSize)}`);
            } catch (error) {
                console.error(`Error uploading batch ${Math.floor(i / batchSize) + 1}:`, error.message);
                errorCount += batch.length;
            }
        }

        // Update log entries
        const logEntries = mappings.map(m => ({
            company_id: m.company_id,
            table_name: 'company_goldstock_mapping',
            update_time: new Date().toISOString(),
            update_description: `Goldstock mapping - ${m.match_status} (${m.match_method}, ${m.confidence_score}% confidence)`
        }));

        // Insert log entries in batches
        for (let i = 0; i < logEntries.length; i += batchSize) {
            const batch = logEntries.slice(i, i + batchSize);
            const { error: logError } = await supabase
                .from('update_log')
                .insert(batch);
            if (logError) {
                console.error('Error updating log:', logError.message);
            }
        }

        console.log(`\nMapping upload complete:`);
        console.log(`- Successfully uploaded: ${successCount}`);
        console.log(`- Errors: ${errorCount}`);
        
        return successCount > 0;
    } catch (error) {
        console.error('Error in upload process:', error.message);
        return false;
    }
}

async function findLogoUrl(goldstockId, companyName) {
    // Try each format
    for (const format of CONFIG.logoFormats) {
        const url = `https://www.goldstockdata.com/images/logos/${goldstockId}.${format}`;
        try {
            const response = await axios.head(url, { 
                timeout: 5000,
                validateStatus: (status) => status === 200
            });
            if (response.status === 200) {
                return { url, format };
            }
        } catch (error) {
            // Continue to next format
        }
    }
    
    return null;
}

async function downloadAndUploadLogo(mapping, logoInfo) {
    try {
        // Download logo
        const response = await axios.get(logoInfo.url, {
            responseType: 'arraybuffer',
            timeout: CONFIG.requestTimeout,
            maxContentLength: 5 * 1024 * 1024, // 5MB limit
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LogoDownloader/1.0)'
            }
        });

        const fileName = `logos/${mapping.company_id}.${logoInfo.format}`;
        const contentType = `image/${logoInfo.format === 'jpg' ? 'jpeg' : logoInfo.format}`;

        // Upload to Supabase storage
        const { data, error: uploadError } = await supabase.storage
            .from('company-logos')
            .upload(fileName, response.data, {
                contentType,
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('company-logos')
            .getPublicUrl(fileName);

        // Update company record
        const { error: updateError } = await supabase
            .from('companies')
            .update({
                logo_url: publicUrl,
                logo_source: 'goldstockdata',
                logo_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('company_id', mapping.company_id);

        if (updateError) throw updateError;

        return { success: true, publicUrl };
    } catch (error) {
        console.error(`Failed to process logo for ${mapping.company_name}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function uploadLogos() {
    try {
        // Fetch all matched mappings
        const { data: mappings, error } = await supabase
            .from('company_goldstock_mapping')
            .select('company_id, goldstock_id, match_status, company_name, confidence_score')
            .in('match_status', ['matched', 'manual'])
            .order('confidence_score', { ascending: false });

        if (error) throw error;
        if (!mappings || mappings.length === 0) {
            console.error('No matched mappings found in company_goldstock_mapping');
            return;
        }

        console.log(`Found ${mappings.length} companies for logo upload`);

        // Load cache
        const cachePath = path.join(__dirname, 'logo_cache.json');
        let logoCache = {};
        try {
            logoCache = JSON.parse(await fs.readFile(cachePath, 'utf-8'));
        } catch (error) {
            console.log('No cache found, starting fresh');
        }

        let successCount = 0;
        let cachedCount = 0;
        let notFoundCount = 0;
        let errorCount = 0;
        const failedCompanies = [];

        // Process in batches
        for (let i = 0; i < mappings.length; i += CONFIG.logoBatchSize) {
            const batch = mappings.slice(i, i + CONFIG.logoBatchSize);
            
            const results = await Promise.all(batch.map(async (mapping) => {
                const cacheKey = `${mapping.company_id}_${mapping.goldstock_id}`;
                
                // Check cache
                if (logoCache[cacheKey]?.success) {
                    cachedCount++;
                    return { mapping, cached: true };
                }

                // Find logo URL
                const logoInfo = await findLogoUrl(mapping.goldstock_id, mapping.company_name);
                if (!logoInfo) {
                    notFoundCount++;
                    failedCompanies.push({
                        company_id: mapping.company_id,
                        company_name: mapping.company_name,
                        goldstock_id: mapping.goldstock_id,
                        reason: 'logo_not_found'
                    });
                    return { mapping, notFound: true };
                }

                // Download and upload
                const result = await downloadAndUploadLogo(mapping, logoInfo);
                
                // Update cache
                logoCache[cacheKey] = {
                    success: result.success,
                    url: result.publicUrl,
                    timestamp: new Date().toISOString()
                };

                if (result.success) {
                    successCount++;
                    console.log(`✓ Uploaded logo for ${mapping.company_name} (ID: ${mapping.company_id})`);
                } else {
                    errorCount++;
                    failedCompanies.push({
                        company_id: mapping.company_id,
                        company_name: mapping.company_name,
                        goldstock_id: mapping.goldstock_id,
                        reason: result.error
                    });
                }

                return { mapping, result };
            }));

            // Save cache after each batch
            await fs.writeFile(cachePath, JSON.stringify(logoCache, null, 2));
            
            console.log(`Processed batch ${Math.floor(i / CONFIG.logoBatchSize) + 1} of ${Math.ceil(mappings.length / CONFIG.logoBatchSize)}`);
            
            // Rate limiting
            if (i + CONFIG.logoBatchSize < mappings.length) {
                await sleep(1000);
            }
        }

        // Save failed companies list
        if (failedCompanies.length > 0) {
            await fs.writeFile(
                path.join(__dirname, 'failed_logos.json'),
                JSON.stringify(failedCompanies, null, 2)
            );
        }

        console.log(`\nLogo upload complete!`);
        console.log(`- New uploads: ${successCount}`);
        console.log(`- From cache: ${cachedCount}`);
        console.log(`- Not found: ${notFoundCount}`);
        console.log(`- Errors: ${errorCount}`);
        console.log(`- Total processed: ${mappings.length}`);

        // Show examples
        const { data: examples } = await supabase
            .from('companies')
            .select('company_id, company_name, logo_url')
            .not('logo_url', 'is', null)
            .limit(5);

        if (examples && examples.length > 0) {
            console.log('\nExample companies with logos:');
            examples.forEach(company => {
                console.log(`- ${company.company_name}: ${company.logo_url}`);
            });
        }

    } catch (error) {
        console.error('Error in logo upload process:', error.message);
    }
}

async function fetchFallbackLogos() {
    try {
        // Get unmatched companies without logos
        const { data: unmatched, error } = await supabase
            .from('company_goldstock_mapping')
            .select('company_id, company_name')
            .eq('match_status', 'unmatched');

        if (error) throw error;

        // Also get companies that failed logo upload
        let failedCompanies = [];
        try {
            const failedData = await fs.readFile(path.join(__dirname, 'failed_logos.json'), 'utf-8');
            failedCompanies = JSON.parse(failedData);
        } catch {}

        const allCompanies = [...unmatched, ...failedCompanies];
        console.log(`\nAttempting fallback logo strategies for ${allCompanies.length} companies...`);

        let successCount = 0;
        for (const company of allCompanies) {
            // Try alternative strategies
            // 1. Check company website
            const { data: urls } = await supabase
                .from('company_urls')
                .select('url')
                .eq('company_id', company.company_id)
                .eq('url_type', 'company_website')
                .limit(1);

            if (urls && urls.length > 0) {
                const website = urls[0].url;
                const possibleLogos = [
                    `${website}/logo.png`,
                    `${website}/images/logo.png`,
                    `${website}/assets/logo.png`,
                    `${website}/favicon.ico`
                ];

                for (const logoUrl of possibleLogos) {
                    try {
                        const response = await axios.head(logoUrl, { timeout: 5000 });
                        if (response.status === 200) {
                            console.log(`✓ Found fallback logo for ${company.company_name} at ${logoUrl}`);
                            successCount++;
                            break;
                        }
                    } catch {}
                }
            }
        }

        console.log(`Fallback search complete: ${successCount} potential logos found`);
        
    } catch (error) {
        console.error('Error in fallback logo search:', error.message);
    }
}

async function generateReport() {
    try {
        // Get statistics
        const { data: mappingData } = await supabase
            .from('company_goldstock_mapping')
            .select('match_status');

        const stats = {};
        if (mappingData) {
            mappingData.forEach(row => {
                stats[row.match_status] = (stats[row.match_status] || 0) + 1;
            });
        }

        const { count: companiesWithLogos } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true })
            .not('logo_url', 'is', null);

        const { count: totalCompanies } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true });

        console.log('\n=== Final Report ===');
        console.log('Mapping Statistics:', stats);
        console.log(`Companies with logos: ${companiesWithLogos} / ${totalCompanies} (${(companiesWithLogos/totalCompanies*100).toFixed(1)}%)`);
        
        // Generate detailed report
        const report = {
            timestamp: new Date().toISOString(),
            mappings: stats,
            logos: {
                total: totalCompanies,
                withLogos: companiesWithLogos,
                percentage: (companiesWithLogos/totalCompanies*100).toFixed(1)
            }
        };

        await fs.writeFile(
            path.join(__dirname, 'upload_report.json'),
            JSON.stringify(report, null, 2)
        );
        console.log('\nDetailed report saved to upload_report.json');

    } catch (error) {
        console.error('Error generating report:', error.message);
    }
}

async function main() {
    console.log('Starting enhanced Supabase upload process...\n');

    // Check environment variables
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_KEY)) {
        console.error('Missing required environment variables!');
        console.error('Ensure SUPABASE_URL and SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY are set in ../.env');
        return;
    }

    // Setup storage bucket
    const bucketOk = await createStorageBucketIfNeeded();
    if (!bucketOk) {
        console.log('\nPlease create the "company-logos" bucket in Supabase dashboard:');
        console.log('Storage > New Bucket > Name: "company-logos", Public: Yes');
        return;
    }

    // Step 1: Upload mappings
    console.log('\n1. Uploading mappings to Supabase...');
    const mappingsOk = await uploadMappingsToSupabase();
    if (!mappingsOk) {
        console.error('\nMapping upload failed. Check company_mappings.csv and retry.');
        return;
    }

    await sleep(2000);

    // Step 2: Upload logos
    console.log('\n2. Uploading logos from goldstockdata.com...');
    await uploadLogos();

    // Step 3: Try fallback strategies
    if (CONFIG.fallbackStrategies) {
        console.log('\n3. Attempting fallback logo strategies...');
        await fetchFallbackLogos();
    }

    // Step 4: Generate report
    console.log('\n4. Generating final report...');
    await generateReport();

    console.log('\n✅ All tasks completed!');
}

// Run the script
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const csv = require('csv-parse/sync');

// Load env from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase client (using ANON key is fine for this)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY
);

console.log('Using Supabase URL:', process.env.SUPABASE_URL);

async function createStorageBucketIfNeeded() {
    try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
            console.log('Note: Cannot list buckets with anon key, assuming bucket exists');
            return true;
        }
        
        const exists = buckets?.some(b => b.name === 'company-logos');
        
        if (!exists) {
            console.log('Creating company-logos bucket...');
            const { data, error } = await supabase.storage.createBucket('company-logos', {
                public: true,
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
            });
            
            if (error) {
                console.error('Error creating bucket:', error);
                return false;
            }
            console.log('✓ Created company-logos bucket');
        } else {
            console.log('✓ company-logos bucket already exists');
        }
        
        return true;
    } catch (error) {
        console.error('Bucket setup error:', error);
        return false;
    }
}

async function uploadMappingsToSupabase() {
    try {
        // Read the CSV file
        const csvPath = path.join(__dirname, 'company_mappings.csv');
        const fileContent = await fs.readFile(csvPath, 'utf-8');
        
        // Parse CSV
        const records = csv.parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });
        
        console.log(`Found ${records.length} mappings to upload`);
        
        // Prepare data for batch insert
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
        
        // Delete existing mappings (optional - remove if you want to keep history)
        const { error: deleteError } = await supabase
            .from('company_goldstock_mapping')
            .delete()
            .gte('company_id', 0);
        
        if (deleteError) {
            console.error('Error clearing existing mappings:', deleteError);
            return;
        }
        
        // Upload in batches of 100
        const batchSize = 100;
        for (let i = 0; i < mappings.length; i += batchSize) {
            const batch = mappings.slice(i, i + batchSize);
            
            const { error } = await supabase
                .from('company_goldstock_mapping')
                .insert(batch);
            
            if (error) {
                console.error(`Error uploading batch ${i / batchSize + 1}:`, error);
                continue;
            }
            
            console.log(`Uploaded batch ${i / batchSize + 1} of ${Math.ceil(mappings.length / batchSize)}`);
        }
        
        // Update the update_log
        const { error: logError } = await supabase
            .from('update_log')
            .insert(
                mappings.map(m => ({
                    company_id: m.company_id,
                    table_name: 'company_goldstock_mapping',
                    update_time: new Date().toISOString(),
                    update_description: `Imported goldstockdata.com mapping - ${m.match_status}`
                }))
            );
        
        if (logError) {
            console.error('Error updating log:', logError);
        }
        
        console.log('All mappings uploaded successfully!');
        
        // Display summary
        const matched = mappings.filter(m => m.match_status === 'matched').length;
        const manual = mappings.filter(m => m.match_status === 'manual').length;
        const unmatched = mappings.filter(m => m.match_status === 'unmatched').length;
        
        console.log(`\nSummary:`);
        console.log(`- Matched: ${matched}`);
        console.log(`- Manual review: ${manual}`);
        console.log(`- Unmatched: ${unmatched}`);
        
    } catch (error) {
        console.error('Error in upload process:', error);
    }
}

async function uploadLogos() {
    try {
        // Fetch only matched mappings
        const { data: mappings, error } = await supabase
            .from('company_goldstock_mapping')
            .select('company_id, goldstock_id, match_status')
            .eq('match_status', 'matched');

        if (error) {
            console.error('Error fetching mappings:', error);
            return;
        }

        console.log(`Found ${mappings.length} matched companies for logo upload`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // Process logos in batches to avoid overwhelming the server
        const batchSize = 5;
        for (let i = 0; i < mappings.length; i += batchSize) {
            const batch = mappings.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (mapping) => {
                const logoUrl = `https://www.goldstockdata.com/images/logos/${mapping.goldstock_id}.png`;
                
                try {
                    // Download the logo
                    const response = await axios.get(logoUrl, { 
                        responseType: 'arraybuffer',
                        timeout: 10000,
                        validateStatus: (status) => status === 200
                    });
                    
                    // Upload to Supabase storage
                    const fileName = `logos/${mapping.company_id}.png`;
                    
                    // Delete existing logo if any
                    await supabase.storage
                        .from('company-logos')
                        .remove([fileName]);
                    
                    const { error: uploadError } = await supabase.storage
                        .from('company-logos')
                        .upload(fileName, response.data, {
                            contentType: 'image/png',
                            upsert: true
                        });
                    
                    if (uploadError) {
                        console.error(`Failed to upload logo for company_id ${mapping.company_id}:`, uploadError);
                        errorCount++;
                        return;
                    }
                    
                    // Get public URL
                    const { data: publicUrl } = supabase.storage
                        .from('company-logos')
                        .getPublicUrl(fileName);
                    
                    // Update company record with logo URL
                    const { error: updateError } = await supabase
                        .from('companies')
                        .update({ 
                            logo_url: publicUrl.publicUrl,
                            updated_at: new Date().toISOString()
                        })
                        .eq('company_id', mapping.company_id);
                    
                    if (updateError) {
                        console.error(`Failed to update company ${mapping.company_id}:`, updateError);
                        errorCount++;
                        return;
                    }
                    
                    successCount++;
                    console.log(`✓ Uploaded logo for company_id ${mapping.company_id}`);
                    
                } catch (error) {
                    if (error.response?.status === 404) {
                        console.log(`✗ No logo found for company_id ${mapping.company_id} (goldstock_id: ${mapping.goldstock_id})`);
                    } else {
                        console.error(`✗ Error processing logo for company_id ${mapping.company_id}:`, error.message);
                    }
                    errorCount++;
                }
            }));
            
            console.log(`Processed batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(mappings.length / batchSize)}`);
            
            // Small delay between batches
            if (i + batchSize < mappings.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`\nLogo upload complete!`);
        console.log(`- Success: ${successCount}`);
        console.log(`- Errors: ${errorCount}`);
        
        // Log some examples
        const { data: examples, error: exampleError } = await supabase
            .from('companies')
            .select('company_id, company_name, logo_url')
            .not('logo_url', 'is', null)
            .limit(5);
        
        if (!exampleError && examples) {
            console.log('\nExample companies with logos:');
            examples.forEach(company => {
                console.log(`- ${company.company_name}: ${company.logo_url}`);
            });
        }
        
    } catch (error) {
        console.error('Error in logo upload process:', error);
    }
}

async function verifySetup() {
    try {
        // Check if table exists
        const { data, error } = await supabase
            .from('company_goldstock_mapping')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('Table check failed. Make sure company_goldstock_mapping table exists:', error);
            return false;
        }
        
        // Check storage bucket
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        
        if (bucketError) {
            console.error('Cannot list storage buckets:', bucketError);
            return false;
        }
        
        const logosBucket = buckets.find(b => b.name === 'company-logos');
        if (!logosBucket) {
            console.error('Storage bucket "company-logos" not found. Please create it in Supabase.');
            return false;
        }
        
        console.log('✓ Setup verified: table and storage bucket exist');
        return true;
        
    } catch (error) {
        console.error('Setup verification failed:', error);
        return false;
    }
}

// Main execution
async function main() {
    console.log('Starting Supabase upload process...\n');
    
    // Check if we have the required environment variables
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_KEY)) {
        console.error('Missing required environment variables!');
        console.error('Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in ../.env');
        return;
    }
    
    // Create storage bucket if needed
    const bucketOk = await createStorageBucketIfNeeded();
    if (!bucketOk) {
        console.log('\nNote: You may need to create the company-logos bucket manually in Supabase dashboard');
        console.log('Go to Storage > New Bucket > Name: "company-logos" > Public: Yes');
    }
    
    // Verify setup
    const setupOk = await verifySetup();
    if (!setupOk) {
        console.error('\nPlease fix the setup issues before continuing.');
        return;
    }
    
    // Step 1: Upload mappings
    console.log('\n1. Uploading mappings to Supabase...');
    await uploadMappingsToSupabase();
    
    // Wait a bit to ensure data is committed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Upload logos
    console.log('\n2. Uploading logos...');
    await uploadLogos();
    
    console.log('\n✓ All done!');
}

// Run the script
main().catch(console.error);
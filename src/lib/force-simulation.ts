// src/lib/force-simulation.ts
// This is YOUR provided code - no changes needed here based on your request.
import { forceSimulation, forceCollide, forceX, forceY, forceManyBody } from 'd3-force';
import type { SimulationNodeDatum } from 'd3-force';

interface LabelNode extends SimulationNodeDatum {
    id: string;
    x: number; // Current simulation x
    y: number; // Current simulation y
    width: number;
    height: number;
    dataX: number; // Original target x
    dataY: number; // Original target y
    radius: number; // Calculated collision radius
    density?: number; // Optional density info
}

// Interface describing the input structure expected by createLabelSimulation
interface InputLabelData {
    id: string;
    x: number; // Initial simulation x (can be same as dataX)
    y: number; // Initial simulation y (can be same as dataY)
    width: number;
    height: number;
    dataX: number; // Target x coordinate (screen position of the data point)
    dataY: number; // Target y coordinate (screen position of the data point)
}

// Function to calculate local density (Optional - kept from your code)
function calculateDensity(
    point: { x: number; y: number },
    allPoints: Array<{ x: number; y: number }>,
    radius: number = 50 // Search radius for density calculation
): number {
    if (!point || !allPoints) return 0;
    return allPoints.filter(p => {
        if (!p) return false;
        const dx = p.x - point.x;
        const dy = p.y - point.y;
        // Check for NaN before sqrt
        if (isNaN(dx) || isNaN(dy)) return false;
        return Math.sqrt(dx * dx + dy * dy) < radius;
    }).length;
}

// Options for configuring the simulation behavior
interface SimulationOptions {
    collisionRadius?: number; // Extra padding around labels for collision detection
    forceStrength?: number;   // Strength of the force pulling labels towards their target (dataX, dataY)
    yOffset?: number;         // Vertical offset applied *by the simulation's Y-force* (often unused if offset applied before simulation)
    densityThreshold?: number;// Threshold to filter labels based on calculated density
    iterations?: number;      // Number of simulation ticks to run
    bounds?: { x0: number, y0: number, x1: number, y1: number }; // Optional bounds to constrain labels
    chargeStrength?: number;  // Optional repulsive force between labels (- negative value)
}

export function createLabelSimulation(
    labels: Array<InputLabelData>,
    width: number,
    height: number,
    options: SimulationOptions = {}
): LabelNode[] {
    const {
        collisionRadius = 1.2,
        forceStrength = 0.2,
        yOffset = 3,
        densityThreshold = 5,
        iterations = 200,
        bounds,
        chargeStrength = -30 // Increased repulsion between labels
    } = options;

    // --- Optional Density Filtering (from your original code) ---
    let filteredLabels = labels;
    if (densityThreshold < 1000) { // Only calculate if threshold is meaningful
        console.log(`Calculating density with radius 50, threshold ${densityThreshold}...`)
        const points = labels.map(l => ({ x: l.dataX, y: l.dataY }));
        const densities = points.map(p => calculateDensity(p, points));
        filteredLabels = labels.filter((label, i) => {
            const density = densities[i];
            const keep = density < densityThreshold;
            // if (!keep && Math.random() < 0.1) { // Log occasional filtered out labels
            //     console.log(`Filtering label ${label.id} due to density ${density}`);
            // }
            return keep;
        });
         console.log(`Filtered ${labels.length - filteredLabels.length} labels due to density.`);
    }
    // --- End Optional Density Filtering ---


    // Convert remaining labels to simulation nodes, calculating collision radius
    const nodes: LabelNode[] = filteredLabels.map((label) => ({
        ...label, // Includes id, x, y, width, height, dataX, dataY
        fx: undefined, // Fixed x position (initially none)
        fy: undefined, // Fixed y position (initially none)
        // Calculate radius based on width/height for collision
        radius: Math.max(label.width / 2, label.height / 2) + (collisionRadius || 1),
        // density: densities ? densities[i] : undefined // Add density if calculated
    }));

    // Create the simulation
    const simulation = forceSimulation(nodes);

    // --- Apply Forces ---
    // Collision Force: Prevents labels from overlapping
    simulation.force('collide', forceCollide<LabelNode>()
        .radius(d => d.radius) // Use pre-calculated radius
        .strength(0.8) // Collision strength (0 to 1)
        .iterations(1) // Collision iterations per tick
    );

    // Positioning Forces: Pull labels towards their target data point coordinates
    simulation.force('x', forceX<LabelNode>(d => d.dataX).strength(forceStrength));
    // Apply the optional simulation yOffset here if needed
    simulation.force('y', forceY<LabelNode>(d => d.dataY + (yOffset || 0)).strength(forceStrength));

    // Optional Charge Force: Makes labels repel each other slightly
    if (chargeStrength && chargeStrength !== 0) {
        simulation.force('charge', forceManyBody<LabelNode>()
            .strength(chargeStrength) // Negative value for repulsion
            .distanceMax(50) // Limit range of charge force
        );
    }

    // Stop the simulation initially, we'll tick manually
    simulation.stop();

    // Run simulation ticks manually
    console.log(`Running simulation for ${iterations} iterations...`);
    for (let i = 0; i < iterations; ++i) {
        simulation.tick();

        // --- Optional Bounding Box ---
        if (bounds) {
            nodes.forEach(node => {
                // Clamp node position within bounds, considering label dimensions
                node.x = Math.max(bounds.x0 + node.width / 2, Math.min(bounds.x1 - node.width / 2, node.x ?? 0));
                node.y = Math.max(bounds.y0 + node.height / 2, Math.min(bounds.y1 - node.height / 2, node.y ?? 0));
            });
        }
        // --- End Optional Bounding Box ---
    }
    console.log("Simulation finished.");


    // Return the final positions of the nodes
    // The returned objects still conform to LabelNode structure
    return nodes;
}
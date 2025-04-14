/**
 * NetLibram Effects Table
 * 
 * This module provides two approaches for loading effects:
 * 1. From embedded data in the code
 * 2. From an external file loaded by the user
 */

// Default embedded effects - this is a sample of the first 30 effects
export const EFFECTS_DATA = `0001 1d10 of caster's fingers turn to stone
0002 1d100 bees swarm harmlessly around the caster for several weeks
0003 1d100 sparkling motes dance about the caster's head until dawn
0004 1d100% of caster's body turns to iron for that many rounds
0005 1d12 ducklings identify the caster as their mother
0006 1d4 of caster's fingers move from his left hand to his right hand
0007 1d4 of caster's limbs are as durable as steel
0008 1d4 of caster's limbs are covered in fish scales
0009 1d4 of caster's limbs are invisible
0010 1d8 of caster's primary orifices seal shut
0011 3d10 harmless lumps as big as walnuts cover the caster's body
0012 3d10 quarts of olive oil pour from caster's ears
0013 4d6 non-functioning eyes appear on the caster's face and head
0014 A 100 yard radius around caster's home is stripped of vegetation
0015 A 2d6 foot radius around caster sinks as many feet into the earth
0016 A basement's been installed in caster's home while he's been away
0017 A close friend of the caster is an assassin hired to kill him
0018 A distant but powerful army declares war on the caster
0019 A drop of the caster's blood can purify 1d4 gallons of water
0020 A family of skunks has taken up residence in the caster's home
0021 A fast-growing oak sprouts beneath the caster's home
0022 A foot-long steel bar runs completely through the caster's thigh
0023 A geyser temporarily erupts from one of the caster's pockets
0024 A glowing orb hovers over caster's head while he's invisible
0025 A great wind blows the caster 1d100 yards in a random direction
0026 A group of necromancers take an interest in the caster's skeleton
0027 A group of scholars think the caster's a visitor from the future
0028 A hen's egg tumbles out of each of the caster's ears
0029 A huge balloon shaped like the caster drifts past overhead
0030 A kill-on-sight order has been issued for the caster kingdom-wide`;

/**
 * Parse effects data from a string
 * Format expected: "NNNN description" where NNNN is a 4-digit number
 */
export function parseEffectsString(data: string): Record<number, string> {
    const effects: Record<number, string> = {};
    
    const lines = data.split('\n');
    
    for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;
        
        // Extract effect number and description
        // Format: "0001 effect description"
        const match = line.match(/^(\d+)\s+(.+)$/);
        
        if (match) {
            const effectNumber = parseInt(match[1]);
            const effectDescription = match[2];
            
            effects[effectNumber] = effectDescription;
        }
    }
    
    return effects;
}

/**
 * Parse effects from the embedded data
 */
export function parseEffectsData(): Record<number, string> {
    return parseEffectsString(EFFECTS_DATA);
}

/**
 * Parse effects from a file
 * This can be used if you want to load effects from an external file
 */
export async function parseEffectsFile(file: File): Promise<Record<number, string>> {
    try {
        const text = await file.text();
        return parseEffectsString(text);
    } catch (error) {
        console.error("Failed to parse effects file:", error);
        return {};
    }
}
/**
 * Utility functions for parsing NetLibram effects from raw text
 */

/**
 * Parses a file with effects in the format:
 * 9854 The entire area is thickly shrouded by dust and cobwebs
 * 9855 The entire area is transported to a small island far out to sea
 * 
 * Handles various formats, special characters, and quirks in the input file.
 */
export function parseNetLibramEffects(contents: string): Record<number, string> {
    // Result object
    const effects: Record<number, string> = {};
    
    // Split the file by newlines, handling different line endings
    let lines = contents.split(/\r?\n/).filter(line => line.trim() !== '');
    
    console.log(`Processing ${lines.length} lines of text for effects`);
    
    // Process each line
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        // Get the raw line
        let line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        try {
            // Extract number at the beginning of the line
            // First, check if the line starts with a number followed by a space
            const numberMatch = line.match(/^(\d+)/);
            
            if (numberMatch) {
                // We found a number at the start of the line
                const number = parseInt(numberMatch[1], 10);
                
                // Get the rest of the line after the number
                const effectText = line.substring(numberMatch[0].length).trim();
                
                if (effectText) {
                    // Store the effect
                    effects[number] = effectText;
                    successCount++;
                    
                    // Log occasionally to show progress
                    if (successCount <= 5 || successCount % 1000 === 0) {
                        console.log(`Processed effect #${number}: ${effectText.substring(0, 40)}...`);
                    }
                } else {
                    console.log(`No description found for effect #${number} on line ${i+1}`);
                    failureCount++;
                }
            } else {
                console.log(`No number found at the beginning of line ${i+1}: "${line.substring(0, 40)}..."`);
                failureCount++;
            }
        } catch (error) {
            console.error(`Error processing line ${i+1}: ${error.message}`);
            failureCount++;
        }
    }
    
    console.log(`Finished processing: ${successCount} effects successfully parsed, ${failureCount} failures`);
    return effects;
}

/**
 * Converts a raw NetLibram effects file to JSON format
 */
export function convertNetLibramToJson(contents: string): string {
    const effects = parseNetLibramEffects(contents);
    return JSON.stringify(effects, null, 2);
}
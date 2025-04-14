import { App, Plugin, PluginSettingTab, Setting, Notice, ItemView } from 'obsidian';
import { NetLibramView } from './view';
import { NetLibramPluginAPI, NetLibramRecipe, NetLibramPluginSettings, getTextValue, setTextValue, ViewUpdate, NetLibramViewAPI } from './types';
import { parseEffectsData, parseEffectsFile } from './effects';

const DEFAULT_SETTINGS: NetLibramPluginSettings = {
    knownRecipes: [],
    effectsTable: {} // This will be populated with the effects table
}

export default class NetLibramPlugin extends Plugin implements NetLibramPluginAPI {
    settings: NetLibramPluginSettings;
    view: NetLibramView;

    async onload() {
        await this.loadSettings();

        // Register view with type assertion to fix the type error
        this.registerView(
            'netLibram-view',
            (leaf) => {
                this.view = new NetLibramView(leaf, this.settings, this.saveSettings.bind(this), this.app);
                return this.view as unknown as ItemView;
            }
        );

        // Add ribbon icon
        this.addRibbonIcon('dice', 'NetLibram Tracker', () => {
            this.activateView();
        });

        // Add command to open view
        this.addCommand({
            id: 'open-netLibram-tracker',
            name: 'Open NetLibram Tracker',
            callback: () => {
                this.activateView();
            }
        });

        // Register settings tab
        this.addSettingTab(new NetLibramSettingTab(this.app, this));

        // Load effects table if empty
        if (Object.keys(this.settings.effectsTable).length === 0) {
            this.loadEffectsTable();
        }
    }

    onunload() {
        this.app.workspace.detachLeavesOfType('netLibram-view');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        if (this.view) {
            this.view.handleViewUpdate(ViewUpdate.SETTINGS_CHANGED);
        }
    }

    async activateView() {
        const { workspace } = this.app;
        
        // Check if view is already open
        const leaves = workspace.getLeavesOfType('netLibram-view');
        if (leaves.length > 0) {
            workspace.revealLeaf(leaves[0]);
            return;
        }

        // If not open, create it in the right sidebar
        const leaf = workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({
                type: 'netLibram-view',
                active: true,
            });

            workspace.revealLeaf(
                workspace.getLeavesOfType('netLibram-view')[0]
            );
        }
    }

    loadEffectsTable() {
        // Load the effects from the effects.ts file
        const effects = parseEffectsData();
        const effectCount = Object.keys(effects).length;
        
        console.log(`Loaded ${effectCount} effects from default data`);
        
        if (effectCount > 0) {
            this.settings.effectsTable = effects;
            this.saveSettings();
            console.log("Effects table saved to settings");
        } else {
            console.error("Failed to load any effects from default data");
        }
    }

    rollDice(): number {
        // Roll 4 ten-sided dice for a number between 0001-10000
        const d1 = Math.floor(Math.random() * 10); // 0-9
        const d2 = Math.floor(Math.random() * 10); // 0-9
        const d3 = Math.floor(Math.random() * 10); // 0-9
        const d4 = Math.floor(Math.random() * 10); // 0-9
        
        // Combine to get 0000-9999, add 1 to get 0001-10000
        const result = d1 * 1000 + d2 * 100 + d3 * 10 + d4 + 1;
        
        console.log(`Rolled dice: ${d1}${d2}${d3}${d4} = ${result}`);
        
        return result;
    }

    getEffect(roll: number): string {
        // Get closest effect based on roll
        const keys = Object.keys(this.settings.effectsTable)
            .map(Number)
            .sort((a, b) => a - b);
        
        if (keys.length === 0) {
            console.log("No effects found in the table!");
            return "No effects loaded. Please check settings.";
        }
        
        console.log(`Looking for effect #${roll} in ${keys.length} effects`);
        console.log(`First few keys: ${keys.slice(0, 5).join(', ')}`);
        console.log(`Last few keys: ${keys.slice(-5).join(', ')}`);
        
        // Find exact match if exists
        if (this.settings.effectsTable[roll]) {
            console.log(`Found exact match for effect #${roll}`);
            return this.settings.effectsTable[roll];
        }
        
        // Find the closest key that is less than or equal to the roll
        let closestKey = keys[0];
        for (const key of keys) {
            if (key <= roll) {
                closestKey = key;
            } else {
                break;
            }
        }
        
        console.log(`Using closest effect #${closestKey} for roll ${roll}`);
        return this.settings.effectsTable[closestKey] || "No effect found";
    }

    addRecipe(ingredients: string[], outcome: number, effect: string) {
        this.settings.knownRecipes.push({
            ingredients,
            outcome,
            effect
        });
        this.saveSettings();
    }

    clearRecipes() {
        this.settings.knownRecipes = [];
        this.saveSettings();
    }

    editRecipe(index: number, ingredients: string[], outcome: number, effect: string) {
        if (index >= 0 && index < this.settings.knownRecipes.length) {
            this.settings.knownRecipes[index] = {
                ingredients,
                outcome,
                effect
            };
            this.saveSettings();
        }
    }

    findRecipe(ingredients: string[]): NetLibramRecipe | null {
        // Sort both arrays before comparison to ensure order doesn't matter
        const sortedIngredients = [...ingredients].sort();
        
        return this.settings.knownRecipes.find(recipe => {
            const sortedRecipeIngredients = [...recipe.ingredients].sort();
            return sortedRecipeIngredients.every((item, index) => 
                item.toLowerCase() === sortedIngredients[index].toLowerCase()
            );
        }) || null;
    }

    exportRecipes(): string {
        return JSON.stringify(this.settings.knownRecipes, null, 2);
    }

    importRecipes(jsonData: string): boolean {
        try {
            const recipes = JSON.parse(jsonData);
            if (Array.isArray(recipes)) {
                this.settings.knownRecipes = recipes;
                this.saveSettings();
                return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to import recipes:", e);
            return false;
        }
    }
}

class NetLibramSettingTab extends PluginSettingTab {
    plugin: NetLibramPlugin;
    recipeListEl: HTMLElement;

    constructor(app: App, plugin: NetLibramPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'NetLibram Tracker Settings' });

        // Effects section
        containerEl.createEl('h3', { text: 'Effects Table' });

        // Display number of effects
        const effectsCount = Object.keys(this.plugin.settings.effectsTable).length;
        containerEl.createEl('p', { 
            text: `Currently loaded: ${effectsCount} effects` 
        });

        // Add effects file import
        const effectsDiv = containerEl.createDiv();
        let effectsFile: File | null = null;
        
        new Setting(effectsDiv)
            .setName('Import Effects Table')
            .setDesc('Import custom effects from a text file (Format: "NNNN Description" per line)')
            .addButton(button => button
                .setButtonText('Select File')
                .onClick(() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.txt';
                    input.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files && target.files.length > 0) {
                            effectsFile = target.files[0];
                            button.setButtonText(effectsFile.name);
                        }
                    };
                    input.click();
                })
            );
            
        new Setting(effectsDiv)
            .addButton(button => button
                .setButtonText('Import Effects')
                .onClick(async () => {
                    if (effectsFile) {
                        try {
                            const effects = await parseEffectsFile(effectsFile);
                            const effectsCount = Object.keys(effects).length;
                            
                            console.log(`Parsed ${effectsCount} effects from imported file`);
                            if (effectsCount > 0) {
                                // Display some sample effects for debugging
                                const keys = Object.keys(effects).map(Number).sort((a, b) => a - b);
                                console.log(`First effect: #${keys[0]} = ${effects[keys[0]]}`);
                                if (keys.length > 1) {
                                    console.log(`Last effect: #${keys[keys.length-1]} = ${effects[keys[keys.length-1]]}`);
                                }
                                
                                this.plugin.settings.effectsTable = effects;
                                await this.plugin.saveSettings();
                                
                                // Show success message first
                                new Notice(`Successfully imported ${effectsCount} effects`);
                                
                                // Instead of trying to redisplay immediately, which might fail,
                                // we can set a small timeout to give the DOM time to update
                                setTimeout(() => {
                                    try {
                                        // Refresh the settings tab
                                        this.display();
                                    } catch (displayError) {
                                        console.error("Error refreshing display:", displayError);
                                        
                                        // If we still get an error, try one more time with a clean rebuild
                                        setTimeout(() => {
                                            try {
                                                const containerSaved = this.containerEl;
                                                containerSaved.empty();
                                                this.display();
                                            } catch (finalError) {
                                                console.error("Final error during display refresh:", finalError);
                                            }
                                        }, 200);
                                    }
                                }, 100);
                            } else {
                                console.error("No effects found in imported file");
                                new Notice('No valid effects found in the file');
                            }
                        } catch (error) {
                            console.error("Error importing effects file:", error);
                            new Notice(`Error importing effects: ${error.message}`);
                        }
                    } else {
                        new Notice('Please select a file first');
                    }
                })
            );

        // Add manual recipe section
        containerEl.createEl('h3', { text: 'Add Recipe Manually' });
        
        const addRecipeDiv = containerEl.createDiv();
        addRecipeDiv.addClass('netLibram-add-recipe');
        
        const ingredient1 = new Setting(addRecipeDiv)
            .setName('Ingredient 1')
            .addText(text => text);
            
        const ingredient2 = new Setting(addRecipeDiv)
            .setName('Ingredient 2')
            .addText(text => text);
            
        const ingredient3 = new Setting(addRecipeDiv)
            .setName('Ingredient 3')
            .addText(text => text);
            
        const outcome = new Setting(addRecipeDiv)
            .setName('Outcome Number')
            .addText(text => text.setPlaceholder('1-10000'));
        
        new Setting(addRecipeDiv)
            .addButton(button => button
                .setButtonText('Add Recipe')
                .onClick(() => {
                    // Use any cast to get around TypeScript type checking
                    // This is a common approach when working with Obsidian API
                    const ing1 = getTextValue(ingredient1.components[0]);
                    const ing2 = getTextValue(ingredient2.components[0]);
                    const ing3 = getTextValue(ingredient3.components[0]);
                    const outcomeValue = parseInt(getTextValue(outcome.components[0]));
                    
                    if (ing1 && ing2 && ing3 && !isNaN(outcomeValue)) {
                        const effect = this.plugin.getEffect(outcomeValue);
                        this.plugin.addRecipe([ing1, ing2, ing3], outcomeValue, effect);
                        
                        // Clear inputs
                        setTextValue(ingredient1.components[0], '');
                        setTextValue(ingredient2.components[0], '');
                        setTextValue(ingredient3.components[0], '');
                        setTextValue(outcome.components[0], '');
                        
                        // Refresh recipe list
                        this.displayRecipeList();
                    }
                })
            );

        // Export/Import section
        containerEl.createEl('h3', { text: 'Export/Import Recipes' });
        
        new Setting(containerEl)
            .setName('Export Recipes')
            .setDesc('Export all known recipes as JSON')
            .addButton(button => button
                .setButtonText('Export')
                .onClick(() => {
                    const json = this.plugin.exportRecipes();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'netLibram-recipes.json';
                    a.click();
                    
                    URL.revokeObjectURL(url);
                })
            );
            
        const importDiv = containerEl.createDiv();
        let importFile: File | null = null;
        
        new Setting(importDiv)
            .setName('Import Recipes')
            .setDesc('Import recipes from JSON file')
            .addButton(button => button
                .setButtonText('Select File')
                .onClick(() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files && target.files.length > 0) {
                            importFile = target.files[0];
                            button.setButtonText(importFile.name);
                        }
                    };
                    input.click();
                })
            );
            
        new Setting(importDiv)
            .addButton(button => button
                .setButtonText('Import')
                .onClick(async () => {
                    if (importFile) {
                        const text = await importFile.text();
                        const success = this.plugin.importRecipes(text);
                        
                        if (success) {
                            // Refresh recipe list
                            this.displayRecipeList();
                            new Notice('Recipes imported successfully');
                        } else {
                            new Notice('Failed to import recipes. Invalid format.');
                        }
                    }
                })
            );
        
        // Clear recipes section
        containerEl.createEl('h3', { text: 'Clear All Recipes' });
        
        const clearDiv = containerEl.createDiv();
        clearDiv.addClass('netLibram-clear-div');
        
        const clearSetting = new Setting(clearDiv)
            .setName('Clear All Recipes')
            .setDesc('WARNING: This will delete all known recipes and reset the plugin');
            
        const clearButton = clearSetting.addButton(button => button
            .setButtonText('Clear Recipes')
            .onClick(() => {
                this.plugin.clearRecipes();
                this.displayRecipeList();
                new Notice('All recipes have been cleared');
            })
        );
        
        // Style the clear button
        // Use as any to get around TypeScript type checking
        const buttonEl = (clearButton as any).buttonEl;
        buttonEl.addClass('netLibram-clear-button');
            
        // Known recipes list
        containerEl.createEl('h3', { text: 'Known Recipes' });
        
        // Ensure recipeListEl is initialized
        this.recipeListEl = containerEl.createDiv();
        this.recipeListEl.addClass('netLibram-recipe-list');
        
        this.displayRecipeList();
    }
    
    displayRecipeList() {
        // Make sure recipeListEl exists before trying to use it
        if (!this.recipeListEl) {
            console.error("Recipe list element is undefined");
            return;
        }
        
        this.recipeListEl.empty();
        
        if (this.plugin.settings.knownRecipes.length === 0) {
            this.recipeListEl.createEl('p', { 
                text: 'No known recipes yet. Create recipes by using the tracker or adding them manually.'
            });
            return;
        }
        
        const recipes = this.plugin.settings.knownRecipes;
        
        for (let i = 0; i < recipes.length; i++) {
            const recipe = recipes[i];
            const recipeDiv = this.recipeListEl.createDiv();
            recipeDiv.addClass('netLibram-recipe-item');
            
            const header = recipeDiv.createEl('div');
            header.addClass('netLibram-recipe-header');
            
            header.createEl('span', { 
                text: `${recipe.ingredients.join(' + ')} = #${recipe.outcome}` 
            });
            
            const expandButton = header.createEl('button');
            expandButton.setText('Edit');
            
            const details = recipeDiv.createDiv();
            details.addClass('netLibram-recipe-details');
            details.style.display = 'none';
            
            details.createEl('p', { text: `Effect: ${recipe.effect}` });
            
            const editDiv = details.createDiv();
            editDiv.addClass('netLibram-edit-recipe');
            
            const ing1 = new Setting(editDiv)
                .setName('Ingredient 1')
                .addText(text => text.setValue(recipe.ingredients[0]));
                
            const ing2 = new Setting(editDiv)
                .setName('Ingredient 2')
                .addText(text => text.setValue(recipe.ingredients[1]));
                
            const ing3 = new Setting(editDiv)
                .setName('Ingredient 3')
                .addText(text => text.setValue(recipe.ingredients[2]));
            
            new Setting(editDiv)
                .addButton(button => button
                    .setButtonText('Save Changes')
                    .onClick(() => {
                        const newIng1 = getTextValue(ing1.components[0]);
                        const newIng2 = getTextValue(ing2.components[0]);
                        const newIng3 = getTextValue(ing3.components[0]);
                        
                        if (newIng1 && newIng2 && newIng3) {
                            this.plugin.editRecipe(i, [newIng1, newIng2, newIng3], recipe.outcome, recipe.effect);
                            this.displayRecipeList();
                            new Notice('Recipe updated');
                        }
                    })
                )
                .addButton(button => button
                    .setButtonText('Delete')
                    .onClick(() => {
                        this.plugin.settings.knownRecipes.splice(i, 1);
                        this.plugin.saveSettings();
                        this.displayRecipeList();
                        new Notice('Recipe deleted');
                    })
                );
            
            expandButton.onclick = () => {
                if (details.style.display === 'none') {
                    details.style.display = 'block';
                    expandButton.setText('Close');
                } else {
                    details.style.display = 'none';
                    expandButton.setText('Edit');
                }
            };
        }
    }
}
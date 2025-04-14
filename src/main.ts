import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { NetLibramView, ViewUpdate } from './view';

interface NetLibramRecipe {
    ingredients: string[];
    outcome: number;
    effect: string;
}

interface NetLibramPluginSettings {
    knownRecipes: NetLibramRecipe[];
    effectsTable: Record<number, string>;
}

const DEFAULT_SETTINGS: NetLibramPluginSettings = {
    knownRecipes: [],
    effectsTable: {} // This would be populated with your actual effects table
}

export default class NetLibramPlugin extends Plugin {
    settings: NetLibramPluginSettings;
    view: NetLibramView;

    async onload() {
        await this.loadSettings();

        // Register view
        this.registerView(
            'netLibram-view',
            (leaf) => {
                this.view = new NetLibramView(leaf, this.settings, this.saveSettings.bind(this), this.app);
                return this.view;
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

        // Load sample effects table if empty
        if (Object.keys(this.settings.effectsTable).length === 0) {
            this.loadSampleEffectsTable();
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
        await workspace.getRightLeaf(false).setViewState({
            type: 'netLibram-view',
            active: true,
        });

        workspace.revealLeaf(
            workspace.getLeavesOfType('netLibram-view')[0]
        );
    }

    loadSampleEffectsTable() {
        // This would be populated with your actual effects data
        // For demonstration, I'll add just a few sample effects
        const sampleEffects: Record<number, string> = {
            1: "Transmutation: Object becomes solid gold",
            100: "Elemental: Creates a small flame that never extinguishes",
            500: "Illusion: Creates a convincing illusion of the user's choice",
            1000: "Healing: Cures any disease or poison",
            5000: "Destruction: Causes a small explosion",
            9999: "Reality Warping: Completely changes the nature of reality in the immediate area"
        };

        this.settings.effectsTable = sampleEffects;
        this.saveSettings();
    }

    rollDice(): number {
        // Roll 4 ten-sided dice for a number between 0001-10000
        const d1 = Math.floor(Math.random() * 10); // 0-9
        const d2 = Math.floor(Math.random() * 10); // 0-9
        const d3 = Math.floor(Math.random() * 10); // 0-9
        const d4 = Math.floor(Math.random() * 10); // 0-9
        
        // Combine to get 0000-9999, add 1 to get 0001-10000
        return d1 * 1000 + d2 * 100 + d3 * 10 + d4 + 1;
    }

    getEffect(roll: number): string {
        // Get closest effect based on roll
        const keys = Object.keys(this.settings.effectsTable).map(Number).sort((a, b) => a - b);
        
        // Find the closest key that is less than or equal to the roll
        let closestKey = keys[0];
        for (const key of keys) {
            if (key <= roll) {
                closestKey = key;
            } else {
                break;
            }
        }
        
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

    importRecipes(jsonData: string) {
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
                    const ing1 = ingredient1.components[0].getValue();
                    const ing2 = ingredient2.components[0].getValue();
                    const ing3 = ingredient3.components[0].getValue();
                    const outcomeValue = parseInt(outcome.components[0].getValue());
                    
                    if (ing1 && ing2 && ing3 && !isNaN(outcomeValue)) {
                        const effect = this.plugin.getEffect(outcomeValue);
                        this.plugin.addRecipe([ing1, ing2, ing3], outcomeValue, effect);
                        
                        // Clear inputs
                        ingredient1.components[0].setValue('');
                        ingredient2.components[0].setValue('');
                        ingredient3.components[0].setValue('');
                        outcome.components[0].setValue('');
                        
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
            })
        );
        
        // Style the clear button
        const buttonEl = clearButton.buttonEl;
        buttonEl.addClass('netLibram-clear-button');
            
        // Known recipes list
        containerEl.createEl('h3', { text: 'Known Recipes' });
        this.recipeListEl = containerEl.createDiv();
        this.recipeListEl.addClass('netLibram-recipe-list');
        
        this.displayRecipeList();
    }
    
    displayRecipeList() {
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
                        const newIng1 = ing1.components[0].getValue();
                        const newIng2 = ing2.components[0].getValue();
                        const newIng3 = ing3.components[0].getValue();
                        
                        if (newIng1 && newIng2 && newIng3) {
                            this.plugin.editRecipe(i, [newIng1, newIng2, newIng3], recipe.outcome, recipe.effect);
                            this.displayRecipeList();
                        }
                    })
                )
                .addButton(button => button
                    .setButtonText('Delete')
                    .onClick(() => {
                        this.plugin.settings.knownRecipes.splice(i, 1);
                        this.plugin.saveSettings();
                        this.displayRecipeList();
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
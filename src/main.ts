import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { NetLibramPlugin } from './main';
import { parseEffectsFile } from './effects';

export class NetLibramSettingTab extends PluginSettingTab {
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
                        const effects = await parseEffectsFile(effectsFile);
                        const effectsCount = Object.keys(effects).length;
                        
                        if (effectsCount > 0) {
                            this.plugin.settings.effectsTable = effects;
                            await this.plugin.saveSettings();
                            
                            // Reload the settings page to show the new count
                            this.display();
                            
                            // Show success message
                            new Notice(`Successfully imported ${effectsCount} effects`);
                        } else {
                            new Notice('No valid effects found in the file');
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
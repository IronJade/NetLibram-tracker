import { ItemView, WorkspaceLeaf, App } from 'obsidian';
import { NetLibramPlugin } from './main';

export enum ViewUpdate {
    SETTINGS_CHANGED,
    RECIPE_ADDED,
    RECIPE_EDITED,
    RECIPES_CLEARED
}

export class NetLibramView extends ItemView {
    private plugin: NetLibramPlugin;
    private contentEl: HTMLElement;
    private inputsEl: HTMLElement;
    private resultsEl: HTMLElement;
    private knownRecipesEl: HTMLElement;
    private ingredient1: HTMLInputElement;
    private ingredient2: HTMLInputElement;
    private ingredient3: HTMLInputElement;
    private rollButton: HTMLButtonElement;
    private resultText: HTMLElement;
    private diceResult: HTMLElement;

    constructor(
        leaf: WorkspaceLeaf,
        private settings: any,
        private saveSettings: () => Promise<void>,
        private app: App
    ) {
        super(leaf);
        this.plugin = app.plugins.plugins['netLibram-tracker'] as NetLibramPlugin;
    }

    getViewType(): string {
        return 'netLibram-view';
    }

    getDisplayText(): string {
        return 'NetLibram Tracker';
    }

    getIcon(): string {
        return 'dice';
    }

    async onOpen() {
        this.contentEl = this.containerEl.children[1].createDiv();
        this.contentEl.addClass('netLibram-view');

        // Create tabs for Recipe Creator and Known Recipes
        const tabsEl = this.contentEl.createDiv();
        tabsEl.addClass('netLibram-tabs');

        const creatorTabButton = tabsEl.createEl('button');
        creatorTabButton.setText('Recipe Creator');
        creatorTabButton.addClass('netLibram-tab-button');
        creatorTabButton.addClass('active');

        const knownRecipesTabButton = tabsEl.createEl('button');
        knownRecipesTabButton.setText('Known Recipes');
        knownRecipesTabButton.addClass('netLibram-tab-button');

        const tabContentEl = this.contentEl.createDiv();
        tabContentEl.addClass('netLibram-tab-content');

        // Create Recipe Creator tab content
        const creatorEl = tabContentEl.createDiv();
        creatorEl.addClass('netLibram-creator');
        creatorEl.addClass('active');

        this.renderCreatorTab(creatorEl);

        // Create Known Recipes tab content
        this.knownRecipesEl = tabContentEl.createDiv();
        this.knownRecipesEl.addClass('netLibram-known-recipes');
        this.knownRecipesEl.style.display = 'none';

        this.renderKnownRecipesTab();

        // Tab switching logic
        creatorTabButton.addEventListener('click', () => {
            creatorTabButton.addClass('active');
            knownRecipesTabButton.removeClass('active');
            creatorEl.style.display = 'block';
            this.knownRecipesEl.style.display = 'none';
        });

        knownRecipesTabButton.addEventListener('click', () => {
            knownRecipesTabButton.addClass('active');
            creatorTabButton.removeClass('active');
            creatorEl.style.display = 'none';
            this.knownRecipesEl.style.display = 'block';
        });
    }

    renderCreatorTab(containerEl: HTMLElement) {
        // Title
        containerEl.createEl('h3', { text: 'NetLibram Recipe Creator' });

        // Inputs section
        this.inputsEl = containerEl.createDiv();
        this.inputsEl.addClass('netLibram-inputs');

        // Create 3 input fields
        const inputGroup1 = this.inputsEl.createDiv();
        inputGroup1.addClass('netLibram-input-group');
        inputGroup1.createEl('label', { text: 'Ingredient 1:' });
        this.ingredient1 = inputGroup1.createEl('input');
        this.ingredient1.type = 'text';
        this.ingredient1.placeholder = 'Enter first ingredient';

        const inputGroup2 = this.inputsEl.createDiv();
        inputGroup2.addClass('netLibram-input-group');
        inputGroup2.createEl('label', { text: 'Ingredient 2:' });
        this.ingredient2 = inputGroup2.createEl('input');
        this.ingredient2.type = 'text';
        this.ingredient2.placeholder = 'Enter second ingredient';

        const inputGroup3 = this.inputsEl.createDiv();
        inputGroup3.addClass('netLibram-input-group');
        inputGroup3.createEl('label', { text: 'Ingredient 3:' });
        this.ingredient3 = inputGroup3.createEl('input');
        this.ingredient3.type = 'text';
        this.ingredient3.placeholder = 'Enter third ingredient';

        // Roll button
        const buttonGroup = this.inputsEl.createDiv();
        buttonGroup.addClass('netLibram-button-group');
        this.rollButton = buttonGroup.createEl('button');
        this.rollButton.setText('Roll Dice');
        this.rollButton.addClass('netLibram-roll-button');
        this.rollButton.addEventListener('click', this.handleRoll.bind(this));

        // Results section
        this.resultsEl = containerEl.createDiv();
        this.resultsEl.addClass('netLibram-results');
        this.resultsEl.style.display = 'none';

        // Dice roll result
        const diceGroup = this.resultsEl.createDiv();
        diceGroup.addClass('netLibram-dice-result');
        diceGroup.createEl('h4', { text: 'Dice Roll:' });
        this.diceResult = diceGroup.createEl('span');
        this.diceResult.addClass('netLibram-dice-number');

        // Effect result
        const effectGroup = this.resultsEl.createDiv();
        effectGroup.addClass('netLibram-effect-result');
        effectGroup.createEl('h4', { text: 'Effect:' });
        this.resultText = effectGroup.createEl('p');
        this.resultText.addClass('netLibram-effect-text');
    }

    renderKnownRecipesTab() {
        this.knownRecipesEl.empty();
        
        // Title
        this.knownRecipesEl.createEl('h3', { text: 'Known Recipes' });
        
        const recipes = this.settings.knownRecipes;
        
        if (recipes.length === 0) {
            this.knownRecipesEl.createEl('p', { 
                text: 'No known recipes yet. Create recipes by using the Recipe Creator tab.'
            });
            return;
        }
        
        // Create a list of known recipes
        const recipeList = this.knownRecipesEl.createEl('div');
        recipeList.addClass('netLibram-recipe-list');
        
        for (const recipe of recipes) {
            const recipeItem = recipeList.createDiv();
            recipeItem.addClass('netLibram-recipe-item');
            
            const recipeHeader = recipeItem.createEl('div');
            recipeHeader.addClass('netLibram-recipe-header');
            
            const outcomeEL = recipeHeader.createEl('span', { 
                text: `Effect #${recipe.outcome}`
            });
            outcomeEL.addClass('netLibram-recipe-outcome');
            
            const expandButton = recipeHeader.createEl('button');
            expandButton.setText('Details');
            expandButton.addClass('netLibram-expand-button');
            
            const recipeDetails = recipeItem.createEl('div');
            recipeDetails.addClass('netLibram-recipe-details');
            recipeDetails.style.display = 'none';
            
            // Ingredients
            const ingredientsEl = recipeDetails.createEl('div');
            ingredientsEl.addClass('netLibram-recipe-ingredients');
            ingredientsEl.createEl('h4', { text: 'Ingredients:' });
            const ingredientsList = ingredientsEl.createEl('ul');
            
            for (const ingredient of recipe.ingredients) {
                ingredientsList.createEl('li', { text: ingredient });
            }
            
            // Effect
            const effectEl = recipeDetails.createEl('div');
            effectEl.addClass('netLibram-recipe-effect');
            effectEl.createEl('h4', { text: 'Effect:' });
            effectEl.createEl('p', { text: recipe.effect });
            
            // Toggle recipe details
            expandButton.addEventListener('click', () => {
                if (recipeDetails.style.display === 'none') {
                    recipeDetails.style.display = 'block';
                    expandButton.setText('Hide');
                } else {
                    recipeDetails.style.display = 'none';
                    expandButton.setText('Details');
                }
            });
        }
    }

    async handleRoll() {
        const ing1 = this.ingredient1.value.trim();
        const ing2 = this.ingredient2.value.trim();
        const ing3 = this.ingredient3.value.trim();
        
        // Validate inputs
        if (!ing1 || !ing2 || !ing3) {
            // Show error
            this.showError('Please fill in all three ingredients');
            return;
        }
        
        const ingredients = [ing1, ing2, ing3];
        
        // Check if this recipe is already known
        const existingRecipe = this.plugin.findRecipe(ingredients);
        
        if (existingRecipe) {
            // If recipe is known, show the existing result
            this.showResult(existingRecipe.outcome, existingRecipe.effect);
            return;
        }
        
        // Roll dice to get a result
        const roll = this.plugin.rollDice();
        const effect = this.plugin.getEffect(roll);
        
        // Save the new recipe
        this.plugin.addRecipe(ingredients, roll, effect);
        
        // Show the result
        this.showResult(roll, effect);
        
        // Update the known recipes tab
        this.renderKnownRecipesTab();
    }
    
    showResult(roll: number, effect: string) {
        // Display the results section
        this.resultsEl.style.display = 'block';
        
        // Update dice roll and effect text
        this.diceResult.setText(roll.toString().padStart(4, '0'));
        this.resultText.setText(effect);
        
        // Animate dice roll (optional)
        this.diceResult.addClass('netLibram-dice-rolled');
        setTimeout(() => {
            this.diceResult.removeClass('netLibram-dice-rolled');
        }, 1000);
    }
    
    showError(message: string) {
        // Hide the results section
        this.resultsEl.style.display = 'none';
        
        // Show error message
        const errorEl = document.createElement('div');
        errorEl.addClass('netLibram-error');
        errorEl.setText(message);
        
        this.inputsEl.appendChild(errorEl);
        
        // Remove error after a delay
        setTimeout(() => {
            if (errorEl.parentNode === this.inputsEl) {
                this.inputsEl.removeChild(errorEl);
            }
        }, 3000);
    }

    handleViewUpdate(update: ViewUpdate) {
        switch (update) {
            case ViewUpdate.SETTINGS_CHANGED:
            case ViewUpdate.RECIPE_ADDED:
            case ViewUpdate.RECIPE_EDITED:
            case ViewUpdate.RECIPES_CLEARED:
                this.renderKnownRecipesTab();
                break;
        }
    }

    async onClose() {
        // Clean up when view is closed
        this.contentEl.empty();
    }
}
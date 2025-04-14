import { App } from 'obsidian';

// View update enum
export enum ViewUpdate {
    SETTINGS_CHANGED,
    RECIPE_ADDED,
    RECIPE_EDITED,
    RECIPES_CLEARED
}

export interface NetLibramRecipe {
    ingredients: string[];
    outcome: number;
    effect: string;
}

export interface NetLibramPluginSettings {
    knownRecipes: NetLibramRecipe[];
    effectsTable: Record<number, string>;
}

// This interface represents the public API of your plugin
// that can be used by view.ts without creating circular dependencies
export interface NetLibramPluginAPI {
    settings: NetLibramPluginSettings;
    saveSettings(): Promise<void>;
    rollDice(): number;
    getEffect(roll: number): string;
    addRecipe(ingredients: string[], outcome: number, effect: string): void;
    clearRecipes(): void;
    editRecipe(index: number, ingredients: string[], outcome: number, effect: string): void;
    findRecipe(ingredients: string[]): NetLibramRecipe | null;
    exportRecipes(): string;
    importRecipes(jsonData: string): boolean;
}

// View interface
export interface NetLibramViewAPI {
    handleViewUpdate(update: ViewUpdate): void;
}

// Helper functions for working with Obsidian components
export function getTextValue(component: any): string {
    return component.getValue();
}

export function setTextValue(component: any, value: string): void {
    component.setValue(value);
}
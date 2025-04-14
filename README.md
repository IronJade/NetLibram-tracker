# NetLibram Tracker

A plugin for Obsidian that allows you to track and manage recipes for the NetLibram system. Mix three ingredients, roll the dice, and discover magical effects!

## Features

- **Recipe Creation**: Input three ingredients and roll virtual dice to discover new effects
- **Recipe Management**: All discovered recipes are saved automatically for future reference
- **Recipe Editing**: Edit ingredient names to fix spelling or capitalization
- **Import/Export**: Share your recipe discoveries with others via JSON export/import
- **Settings Tab**: Customize the plugin, add recipes manually, or reset the database

## Usage

### Recipe Creator

1. Open the NetLibram Tracker from the ribbon icon or command palette
2. Enter three ingredients in the input fields
3. Click "Roll Dice" to generate a random effect
4. The result will be saved automatically to your Known Recipes

### Known Recipes

- Access all your discovered recipes in the "Known Recipes" tab
- Click "Details" to view the ingredients that created each effect
- Your recipes persist between sessions

### Settings

The settings tab allows you to:

- Add recipes manually (useful for entering known recipes from outside sources)
- Export all your recipes as a JSON file
- Import recipes from a JSON file
- Clear all recipes and reset the database (use with caution!)
- Edit existing recipes to fix spelling or capitalization

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "NetLibram Tracker"
4. Click Install and Enable

### Manual Installation

1. Download the latest release from the GitHub repository
2. Extract the zip file to your Obsidian plugins folder: `.obsidian/plugins/`
3. Enable the plugin in Obsidian settings

## Development

If you want to contribute to the development of this plugin:

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Make your changes
5. Run `npm run build` to build the plugin

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.
/**
 * Recipes Module - Recipe management and cost calculation
 */

class RecipesModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.selectedRecipes = new Set();
    this.activeFilters = {};
    this.editingRecipe = null;
  }
  
  initialize() {
    console.log('Recipes module initialized');
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Handle recipe form submission
    $(document).on('submit', '#saveRecipe', (e) => {
      if (this.app.state.getState().activeModule === 'recipes') {
        e.preventDefault();
        this.handleRecipeSubmit(e.target);
      }
    });

    // Handle ingredient row management
    $(document).on('click', '.remove-ingredient', () => {
      this.calculateRecipeCost();
    });

    $(document).on('input', '.ingredient-qty, .ingredient-cost', () => {
      this.calculateRecipeCost();
    });

    // Handle scaling calculator
    $(document).on('input', '#scaleServings', () => {
      this.updateScaledRecipe();
    });
  }
  
  onActivate() {
    this.loadInitialData();
  }
  
  async loadInitialData() {
    await Promise.all([
      this.loadRecipes(),
      this.loadCategories(),
      this.loadMenuItems()
    ]);
  }
  
  async loadRecipes() {
    try {
      this.app.state.updateModule('recipes', { loading: true });
      
      const params = new URLSearchParams();
      if (this.activeFilters.category) params.append('category', this.activeFilters.category);
      if (this.activeFilters.search) params.append('search', this.activeFilters.search);
      if (this.activeFilters.difficulty) params.append('difficulty', this.activeFilters.difficulty);
      
      const response = await fetch(`${window.api}recipes/recipes?${params}`);
      const recipes = await response.json();
      
      this.app.state.updateModule('recipes', { 
        recipes,
        loading: false
      });
      
    } catch (error) {
      console.error('Error loading recipes:', error);
      this.app.state.updateModule('recipes', { loading: false });
    }
  }
  
  async loadCategories() {
    try {
      const response = await fetch(`${window.api}recipes/recipes/categories`);
      const categories = await response.json();
      
      this.app.state.updateModule('recipes', { categories });
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }
  
  async loadMenuItems() {
    try {
      const response = await fetch(`${window.api}inventory/products`);
      const menuItems = await response.json();
      
      this.app.state.updateModule('recipes', { menuItems });
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  }
  
  filterRecipes(filters) {
    this.activeFilters = { ...this.activeFilters, ...filters };
    this.loadRecipes();
  }
  
  selectRecipe(recipe) {
    this.app.state.updateModule('recipes', { selectedRecipe: recipe });
  }
  
  toggleRecipeSelection(recipeId) {
    const recipesState = this.app.state.getModuleState('recipes');
    const selected = new Set(recipesState.selectedRecipes || []);
    
    if (selected.has(recipeId)) {
      selected.delete(recipeId);
    } else {
      selected.add(recipeId);
    }
    
    this.app.state.updateModule('recipes', { selectedRecipes: Array.from(selected) });
  }
  
  async createRecipe(recipeData) {
    try {
      const response = await fetch(`${window.api}recipes/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recipeData)
      });
      
      const result = await response.json();
      
      await this.loadRecipes();
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Recipe created successfully', 'Ok');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating recipe:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to create recipe', 'Ok');
      }
      throw error;
    }
  }
  
  async updateRecipe(recipeData) {
    try {
      const response = await fetch(`${window.api}recipes/recipes/${recipeData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recipeData)
      });
      
      const result = await response.json();
      
      await this.loadRecipes();
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Recipe updated successfully', 'Ok');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating recipe:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to update recipe', 'Ok');
      }
      throw error;
    }
  }
  
  async deleteRecipe(recipeId) {
    try {
      await fetch(`${window.api}recipes/recipes/${recipeId}`, {
        method: 'DELETE'
      });
      
      await this.loadRecipes();
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Recipe deleted successfully', 'Ok');
      }
      
    } catch (error) {
      console.error('Error deleting recipe:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to delete recipe', 'Ok');
      }
      throw error;
    }
  }
  
  async calculateRecipeCostForServings(recipeId, servings) {
    try {
      const response = await fetch(`${window.api}recipes/recipes/${recipeId}/calculate-cost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ servings })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error calculating recipe cost:', error);
      throw error;
    }
  }
  
  async exportRecipes() {
    try {
      const response = await fetch(`${window.api}recipes/export/csv`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipes-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      if (window.notiflix) {
        window.notiflix.Notify.success('Recipes exported successfully!');
      }

    } catch (error) {
      console.error('Error exporting recipes:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to export recipes', 'Ok');
      }
    }
  }

  // Menu pricing integration methods
  async updateMenuPricingFromRecipe(recipeId, profitMargin, updateMenu = false) {
    try {
      const response = await fetch(`${window.api}recipes/recipes/update-menu-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipeId,
          profitMargin,
          updateMenu
        })
      });

      const result = await response.json();

      if (response.ok) {
        if (window.notiflix) {
          if (result.menu_item_updated) {
            window.notiflix.Report.success(
              'Success',
              `Menu item price updated from $${result.old_price.toFixed(2)} to $${result.new_price.toFixed(2)}`,
              'Ok'
            );
          } else {
            window.notiflix.Report.success(
              'Success',
              `Suggested price: $${result.suggested_price.toFixed(2)} (${(profitMargin * 100)}% margin)`,
              'Ok'
            );
          }
        }
        return result;
      } else {
        throw new Error(result.error || 'Failed to update menu pricing');
      }

    } catch (error) {
      console.error('Error updating menu pricing:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
      throw error;
    }
  }

  async getPricingSuggestions(profitMargin = 0.3) {
    try {
      const response = await fetch(`${window.api}recipes/recipes/pricing-suggestions?profit_margin=${profitMargin}`);
      const suggestions = await response.json();
      return suggestions;

    } catch (error) {
      console.error('Error getting pricing suggestions:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to get pricing suggestions', 'Ok');
      }
      throw error;
    }
  }

  async bulkUpdateMenuPricing(profitMargin = 0.3, recipeIds = null) {
    try {
      const response = await fetch(`${window.api}recipes/recipes/bulk-update-menu-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profitMargin,
          recipeIds
        })
      });

      const result = await response.json();

      if (response.ok) {
        if (window.notiflix) {
          window.notiflix.Report.success(
            'Success',
            `${result.updated_count} menu item prices updated successfully`,
            'Ok'
          );
        }
        return result;
      } else {
        throw new Error(result.error || 'Failed to bulk update menu pricing');
      }

    } catch (error) {
      console.error('Error bulk updating menu pricing:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
      throw error;
    }
  }

  // Add pricing suggestion UI to recipe row
  renderRecipeRow(recipe) {
    const recipesState = this.app.state.getModuleState('recipes');
    const isSelected = recipesState.selectedRecipes?.includes(recipe._id) || false;

    const pricingAction = recipe.menu_item_id ? `
      <button class="btn btn-sm btn-warning" onclick="window.pharmaApp.getModule('recipes').showPricingSuggestion('${recipe._id}')" title="Update Menu Pricing">
        <i class="fa fa-dollar"></i>
      </button>
    ` : '';

    return `
      <tr class="${isSelected ? 'bg-blue-50' : ''}">
        <td class="p-4">
          <input type="checkbox" ${isSelected ? 'checked' : ''}
                 onchange="window.pharmaApp.getModule('recipes').toggleRecipeSelection('${recipe._id}')">
        </td>
        <td class="p-4">
          <div class="font-medium">${recipe.name}</div>
          <div class="text-xs text-gray-500">${recipe.ingredients?.length || 0} ingredients</div>
        </td>
        <td class="p-4 text-sm">${recipe.category || '-'}</td>
        <td class="p-4 text-sm">${recipe.serving_size || 1}</td>
        <td class="p-4 text-sm">${recipe.prep_time || 0} min</td>
        <td class="p-4 font-medium">$${(recipe.cost_per_serving || 0).toFixed(2)}</td>
        <td class="p-4">
          <span class="px-2 py-1 rounded text-xs ${
            recipe.difficulty_level === 'Easy' ? 'bg-green-100 text-green-800' :
            recipe.difficulty_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }">
            ${recipe.difficulty_level || 'Medium'}
          </span>
        </td>
        <td class="p-4">
          <div class="flex gap-2">
            <button class="btn btn-sm btn-info" onclick="window.pharmaApp.getModule('recipes').viewRecipe('${recipe._id}')">
              <i class="fa fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-primary" onclick="window.pharmaApp.getModule('recipes').editRecipe('${recipe._id}')">
              <i class="fa fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-success" onclick="window.pharmaApp.getModule('recipes').showCostCalculator('${recipe._id}')">
              <i class="fa fa-calculator"></i>
            </button>
            ${pricingAction}
            <button class="btn btn-sm btn-danger" onclick="window.pharmaApp.getModule('recipes').deleteRecipe('${recipe._id}')">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  // Add pricing suggestion methods
  showPricingSuggestion(recipeId) {
    const recipesState = this.app.state.getModuleState('recipes');
    const recipe = recipesState.recipes.find(r => r._id.toString() === recipeId.toString());

    if (recipe) {
      // Show a modal with pricing suggestion options
      const modalHtml = `
        <div class="modal fade" id="pricingSuggestionModal" tabindex="-1" role="dialog">
          <div class="modal-dialog modal-md">
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
                <h4 class="modal-title">Update Menu Pricing</h4>
              </div>
              <div class="modal-body">
                <div class="form-group">
                  <label>Recipe: <strong>${recipe.name}</strong></label>
                </div>
                <div class="form-group">
                  <label>Current Recipe Cost: <strong>$${(recipe.cost_per_serving || 0).toFixed(2)}</strong></label>
                </div>
                <div class="form-group">
                  <label for="profitMargin">Profit Margin (%)</label>
                  <div class="input-group">
                    <input type="number" class="form-control" id="profitMargin" min="0" max="100" step="0.1" value="30">
                    <span class="input-group-addon">%</span>
                  </div>
                </div>
                <div class="form-group">
                  <label>Suggested Price: <strong>$<span id="suggestedPrice">${((recipe.cost_per_serving || 0) * 1.3).toFixed(2)}</span></strong></label>
                </div>
                <div class="checkbox">
                  <label>
                    <input type="checkbox" id="updateMenuCheckbox" checked> Update Menu Item Price
                  </label>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="window.pharmaApp.getModule('recipes').applyPricingUpdate('${recipeId}')">Apply</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Add modal to body and show it
      $('body').append(modalHtml);
      $('#pricingSuggestionModal').modal('show');

      // Update suggested price when profit margin changes
      $('#profitMargin').on('input', function() {
        const margin = parseFloat($(this).val()) || 0;
        const recipeCost = recipe.cost_per_serving || 0;
        const suggestedPrice = recipeCost * (1 + margin / 100);
        $('#suggestedPrice').text(suggestedPrice.toFixed(2));
      });
    }
  }

  applyPricingUpdate(recipeId) {
    const profitMargin = parseFloat($('#profitMargin').val()) / 100;
    const updateMenu = $('#updateMenuCheckbox').is(':checked');

    $('#pricingSuggestionModal').modal('hide');
    $('#pricingSuggestionModal').remove();

    this.updateMenuPricingFromRecipe(recipeId, profitMargin, updateMenu);
  }

  // Add bulk pricing update action to the actions section
  renderActions() {
    const recipesState = this.app.state.getModuleState('recipes');
    const selectedCount = recipesState.selectedRecipes?.length || 0;

    const bulkPricingButton = selectedCount > 0 ? `
      <button class="btn btn-success" onclick="window.pharmaApp.getModule('recipes').showBulkPricingModal()">
        <i class="fa fa-dollar"></i> Update Pricing for Selected
      </button>
    ` : '';

    return `
      <div class="actions-section mb-6">
        <div class="flex justify-between items-center">
          <div class="flex gap-3">
            <button class="btn btn-success" onclick="window.pharmaApp.getModule('recipes').showAddRecipeModal()">
              <i class="fa fa-plus"></i> Add Recipe
            </button>
            <button class="btn btn-info" onclick="window.pharmaApp.getModule('recipes').showImportModal()">
              <i class="fa fa-upload"></i> Import
            </button>
            <button class="btn btn-warning" onclick="window.pharmaApp.getModule('recipes').exportRecipes()">
              <i class="fa fa-download"></i> Export All
            </button>
            ${bulkPricingButton}
          </div>

          <div class="text-sm text-gray-500">
            ${recipesState.recipes?.length || 0} recipes total
          </div>
        </div>
      </div>
    `;
  }

  showBulkPricingModal() {
    const recipesState = this.app.state.getModuleState('recipes');
    const selectedRecipes = recipesState.selectedRecipes || [];
    const selectedCount = selectedRecipes.length;

    if (selectedCount === 0) {
      if (window.notiflix) {
        window.notiflix.Notify.warning('Please select at least one recipe first');
      }
      return;
    }

    const modalHtml = `
      <div class="modal fade" id="bulkPricingModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-md">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
              <h4 class="modal-title">Bulk Update Menu Pricing</h4>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Selected Recipes: <strong>${selectedCount}</strong></label>
              </div>
              <div class="form-group">
                <label for="bulkProfitMargin">Profit Margin (%)</label>
                <div class="input-group">
                  <input type="number" class="form-control" id="bulkProfitMargin" min="0" max="100" step="0.1" value="30">
                  <span class="input-group-addon">%</span>
                </div>
              </div>
              <div class="alert alert-info">
                <i class="fa fa-info-circle"></i> This will update menu item prices for all selected recipes that have linked menu items.
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" onclick="window.pharmaApp.getModule('recipes').applyBulkPricingUpdate()">Apply to All</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal to body and show it
    $('body').append(modalHtml);
    $('#bulkPricingModal').modal('show');
  }

  applyBulkPricingUpdate() {
    const profitMargin = parseFloat($('#bulkProfitMargin').val()) / 100;
    const recipesState = this.app.state.getModuleState('recipes');
    const selectedRecipes = recipesState.selectedRecipes || [];

    $('#bulkPricingModal').modal('hide');
    $('#bulkPricingModal').remove();

    this.bulkUpdateMenuPricing(profitMargin, selectedRecipes);
  }
  
  render() {
    const recipesState = this.app.state.getModuleState('recipes');
    const recipes = recipesState.recipes || [];
    
    return `
      <div class="module-container recipes-module" data-module="recipes">
        <div class="module-header">
          <h1 class="module-title">Recipe Management</h1>
          <p class="module-subtitle">Create and manage recipes with cost calculations and ingredient tracking</p>
        </div>
        
        ${this.renderFilters()}
        ${this.renderActions()}
        ${this.renderRecipesList(recipes)}
      </div>
    `;
  }
  
  renderFilters() {
    const recipesState = this.app.state.getModuleState('recipes');
    const categories = recipesState.categories || [];
    
    return `
      <div class="filters-section mb-6">
        <div class="card">
          <div class="card-body">
            <div class="grid grid-cols-4 gap-4">
              <div class="form-group">
                <label class="form-label">Search Recipes</label>
                <input type="text" class="form-input" placeholder="Search by name, ingredient..." 
                       onkeyup="window.pharmaApp.getModule('recipes').filterRecipes({search: this.value})">
              </div>
              
              <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" onchange="window.pharmaApp.getModule('recipes').filterRecipes({category: this.value})">
                  <option value="">All Categories</option>
                  ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Difficulty</label>
                <select class="form-select" onchange="window.pharmaApp.getModule('recipes').filterRecipes({difficulty: this.value})">
                  <option value="">All Levels</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">&nbsp;</label>
                <button class="btn btn-secondary w-full" onclick="window.pharmaApp.getModule('recipes').clearFilters()">
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderActions() {
    const recipesState = this.app.state.getModuleState('recipes');
    const selectedCount = recipesState.selectedRecipes?.length || 0;
    
    return `
      <div class="actions-section mb-6">
        <div class="flex justify-between items-center">
          <div class="flex gap-3">
            <button class="btn btn-success" onclick="window.pharmaApp.getModule('recipes').showAddRecipeModal()">
              <i class="fa fa-plus"></i> Add Recipe
            </button>
            <button class="btn btn-info" onclick="window.pharmaApp.getModule('recipes').showImportModal()">
              <i class="fa fa-upload"></i> Import
            </button>
            <button class="btn btn-warning" onclick="window.pharmaApp.getModule('recipes').exportRecipes()">
              <i class="fa fa-download"></i> Export All
            </button>
          </div>
          
          <div class="text-sm text-gray-500">
            ${recipesState.recipes?.length || 0} recipes total
          </div>
        </div>
      </div>
    `;
  }
  
  renderRecipesList(recipes) {
    const recipesState = this.app.state.getModuleState('recipes');
    
    if (recipesState.loading) {
      return `
        <div class="loading">
          <div class="spinner"></div>
          <div class="mt-2">Loading recipes...</div>
        </div>
      `;
    }
    
    if (!recipes || recipes.length === 0) {
      return `
        <div class="text-center py-8 text-gray-500">
          <i class="fa fa-utensils text-4xl mb-4"></i>
          <div>No recipes found</div>
          <button class="btn btn-success mt-4" onclick="window.pharmaApp.getModule('recipes').showAddRecipeModal()">
            Create Your First Recipe
          </button>
        </div>
      `;
    }
    
    return `
      <div class="recipes-list">
        <div class="card">
          <div class="card-body p-0">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="p-4 text-left">
                      <input type="checkbox" onchange="window.pharmaApp.getModule('recipes').toggleAllRecipes(this.checked)">
                    </th>
                    <th class="p-4 text-left">Recipe</th>
                    <th class="p-4 text-left">Category</th>
                    <th class="p-4 text-left">Servings</th>
                    <th class="p-4 text-left">Prep Time</th>
                    <th class="p-4 text-left">Cost/Serving</th>
                    <th class="p-4 text-left">Difficulty</th>
                    <th class="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${recipes.map(recipe => this.renderRecipeRow(recipe)).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderRecipeRow(recipe) {
    const recipesState = this.app.state.getModuleState('recipes');
    const isSelected = recipesState.selectedRecipes?.includes(recipe._id) || false;
    
    return `
      <tr class="${isSelected ? 'bg-blue-50' : ''}">
        <td class="p-4">
          <input type="checkbox" ${isSelected ? 'checked' : ''} 
                 onchange="window.pharmaApp.getModule('recipes').toggleRecipeSelection('${recipe._id}')">
        </td>
        <td class="p-4">
          <div class="font-medium">${recipe.name}</div>
          <div class="text-xs text-gray-500">${recipe.ingredients?.length || 0} ingredients</div>
        </td>
        <td class="p-4 text-sm">${recipe.category || '-'}</td>
        <td class="p-4 text-sm">${recipe.serving_size || 1}</td>
        <td class="p-4 text-sm">${recipe.prep_time || 0} min</td>
        <td class="p-4 font-medium">$${(recipe.cost_per_serving || 0).toFixed(2)}</td>
        <td class="p-4">
          <span class="px-2 py-1 rounded text-xs ${
            recipe.difficulty_level === 'Easy' ? 'bg-green-100 text-green-800' :
            recipe.difficulty_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }">
            ${recipe.difficulty_level || 'Medium'}
          </span>
        </td>
        <td class="p-4">
          <div class="flex gap-2">
            <button class="btn btn-sm btn-info" onclick="window.pharmaApp.getModule('recipes').viewRecipe('${recipe._id}')">
              <i class="fa fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-primary" onclick="window.pharmaApp.getModule('recipes').editRecipe('${recipe._id}')">
              <i class="fa fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-success" onclick="window.pharmaApp.getModule('recipes').showCostCalculator('${recipe._id}')">
              <i class="fa fa-calculator"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="window.pharmaApp.getModule('recipes').deleteRecipe('${recipe._id}')">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }
  
  // Helper methods
  clearFilters() {
    this.activeFilters = {};
    this.loadRecipes();
  }
  
  toggleAllRecipes(checked) {
    const recipesState = this.app.state.getModuleState('recipes');
    const recipes = recipesState.recipes || [];
    
    if (checked) {
      this.app.state.updateModule('recipes', { 
        selectedRecipes: recipes.map(r => r._id) 
      });
    } else {
      this.app.state.updateModule('recipes', { selectedRecipes: [] });
    }
  }
  
  showAddRecipeModal() {
    this.editingRecipe = null;
    this.resetRecipeForm();
    $("#recipeModal .modal-title").text("Add New Recipe");
    $("#recipeModal").modal("show");
  }
  
  editRecipe(recipeId) {
    const recipesState = this.app.state.getModuleState('recipes');
    const recipe = recipesState.recipes.find(r => r._id.toString() === recipeId.toString());
    
    if (recipe) {
      this.editingRecipe = recipe;
      this.populateRecipeForm(recipe);
      $("#recipeModal .modal-title").text("Edit Recipe");
      $("#recipeModal").modal("show");
    }
  }
  
  viewRecipe(recipeId) {
    const recipesState = this.app.state.getModuleState('recipes');
    const recipe = recipesState.recipes.find(r => r._id.toString() === recipeId.toString());
    
    if (recipe) {
      this.populateRecipeForm(recipe);
      this.editingRecipe = recipe;
      $("#recipeModal .modal-title").text("View Recipe");
      $("#recipeSubmitBtn").hide();
      $("#recipeModal").modal("show");
    }
  }
  
  showCostCalculator(recipeId) {
    const recipesState = this.app.state.getModuleState('recipes');
    const recipe = recipesState.recipes.find(r => r._id.toString() === recipeId.toString());
    
    if (recipe) {
      $("#scaleRecipeId").val(recipe._id);
      $("#scaleRecipeName").text(recipe.name);
      $("#scaleOriginalServings").text(recipe.serving_size);
      $("#scaleServings").val(recipe.serving_size);
      $("#costCalculatorModal").modal("show");
      this.updateScaledRecipe();
    }
  }
  
  showImportModal() {
    $("#importRecipeModal").modal("show");
  }
  
  resetRecipeForm() {
    $("#recipeForm")[0].reset();
    $("#recipe_id").val("");
    $("#ingredient_list").empty();
    $("#instruction_list").empty();
    this.addIngredientRow();
    this.addInstructionRow();
    this.calculateRecipeCost();
  }
  
  populateRecipeForm(recipe) {
    $("#recipe_id").val(recipe._id);
    $("#recipe_name").val(recipe.name);
    $("#recipe_category").val(recipe.category);
    $("#menu_item_id").val(recipe.menu_item_id || "");
    $("#prep_time").val(recipe.prep_time || "");
    $("#cook_time").val(recipe.cook_time || "");
    $("#serving_size").val(recipe.serving_size || 1);
    $("#yield_percentage").val(recipe.yield_percentage || 100);
    $("#difficulty_level").val(recipe.difficulty_level || "Medium");
    
    // Clear and populate ingredients
    $("#ingredient_list").empty();
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach(ingredient => {
        this.addIngredientRow(ingredient);
      });
    } else {
      this.addIngredientRow();
    }
    
    // Clear and populate instructions
    $("#instruction_list").empty();
    if (recipe.instructions && recipe.instructions.length > 0) {
      recipe.instructions.forEach((instruction, index) => {
        this.addInstructionRow(instruction);
      });
    } else {
      this.addInstructionRow();
    }
    
    // Allergens and dietary info
    $("#allergens").val((recipe.allergens || []).join(', '));
    $("#dietary_info").val((recipe.dietary_info || []).join(', '));
    
    // Show submit button for non-view mode
    $("#recipeSubmitBtn").show();
  }
  
  addIngredientRow(data = {}) {
    const rowId = Date.now() + Math.random();
    const html = `
      <div class="row ingredient-row m-b-5" data-row-id="${rowId}">
        <div class="col-md-4">
          <input type="text" class="form-control input-sm ingredient-name" 
                 placeholder="Ingredient name" value="${data.ingredient_name || ''}">
        </div>
        <div class="col-md-2">
          <input type="number" class="form-control input-sm ingredient-qty" 
                 placeholder="Qty" value="${data.quantity || ''}" min="0" step="0.01">
        </div>
        <div class="col-md-2">
          <select class="form-control input-sm ingredient-unit">
            <option value="g" ${data.unit === 'g' ? 'selected' : ''}>grams</option>
            <option value="ml" ${data.unit === 'ml' ? 'selected' : ''}>ml</option>
            <option value="pieces" ${data.unit === 'pieces' ? 'selected' : ''}>pieces</option>
            <option value="cups" ${data.unit === 'cups' ? 'selected' : ''}>cups</option>
            <option value="tbsp" ${data.unit === 'tbsp' ? 'selected' : ''}>tbsp</option>
            <option value="tsp" ${data.unit === 'tsp' ? 'selected' : ''}>tsp</option>
          </select>
        </div>
        <div class="col-md-2">
          <input type="number" class="form-control input-sm ingredient-cost" 
                 placeholder="Cost/unit" value="${data.cost_per_unit || ''}" min="0" step="0.01">
        </div>
        <div class="col-md-1">
          <button type="button" class="btn btn-xs btn-danger remove-ingredient" onclick="window.pharmaApp.getModule('recipes').removeIngredientRow('${rowId}')">
            <i class="fa fa-times"></i>
          </button>
        </div>
      </div>
    `;
    $("#ingredient_list").append(html);
  }
  
  removeIngredientRow(rowId) {
    $(`.ingredient-row[data-row-id="${rowId}"]`).remove();
    this.calculateRecipeCost();
  }
  
  addInstructionRow(data = '') {
    const rowId = Date.now() + Math.random();
    const html = `
      <div class="row instruction-row m-b-5" data-row-id="${rowId}">
        <div class="col-md-10">
          <input type="text" class="form-control input-sm instruction-text" 
                 placeholder="Cooking instruction" value="${data}">
        </div>
        <div class="col-md-2">
          <button type="button" class="btn btn-xs btn-danger remove-instruction" onclick="window.pharmaApp.getModule('recipes').removeInstructionRow('${rowId}')">
            <i class="fa fa-times"></i>
          </button>
        </div>
      </div>
    `;
    $("#instruction_list").append(html);
  }
  
  removeInstructionRow(rowId) {
    $(`.instruction-row[data-row-id="${rowId}"]`).remove();
  }
  
  calculateRecipeCost() {
    let totalCost = 0;
    let totalQuantity = 0;
    
    $('.ingredient-row').each(function() {
      const qty = parseFloat($(this).find('.ingredient-qty').val()) || 0;
      const cost = parseFloat($(this).find('.ingredient-cost').val()) || 0;
      
      totalCost += qty * cost;
      totalQuantity += qty;
    });
    
    const servingSize = parseInt($('#serving_size').val()) || 1;
    const costPerServing = totalCost / servingSize;
    
    $('#total_ingredient_cost').text(`$${totalCost.toFixed(2)}`);
    $('#cost_per_serving').text(`$${costPerServing.toFixed(2)}`);
  }
  
  updateScaledRecipe() {
    const recipeId = $("#scaleRecipeId").val();
    const servings = parseInt($("#scaleServings").val()) || 1;
    
    if (recipeId && servings > 0) {
      this.calculateRecipeCostForServings(recipeId, servings)
        .then(result => {
          $("#scaledTotalCost").text(`$${result.total_cost.toFixed(2)}`);
          $("#scaledCostPerServing").text(`$${result.cost_per_serving.toFixed(2)}`);
          $("#scalingFactor").text(result.scaling_factor.toFixed(2));
        })
        .catch(error => {
          console.error('Error updating scaled recipe:', error);
        });
    }
  }
  
  async handleRecipeSubmit(form) {
    const formData = new FormData(form);
    const recipeId = $("#recipe_id").val();
    const isUpdate = !!recipeId;
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#recipeModal .modal-content', 'Saving Recipe...');
      
      const recipeData = {
        _id: recipeId || undefined,
        name: $("#recipe_name").val(),
        menu_item_id: $("#menu_item_id").val() || null,
        category: $("#recipe_category").val(),
        prep_time: parseInt($("#prep_time").val()) || 0,
        cook_time: parseInt($("#cook_time").val()) || 0,
        serving_size: parseInt($("#serving_size").val()) || 1,
        yield_percentage: parseFloat($("#yield_percentage").val()) || 100,
        difficulty_level: $("#difficulty_level").val(),
        allergens: $("#allergens").val().split(',').map(a => a.trim()).filter(a => a),
        dietary_info: $("#dietary_info").val().split(',').map(d => d.trim()).filter(d => d),
        ingredients: this.getIngredientsFromForm(),
        instructions: this.getInstructionsFromForm()
      };
      
      if (isUpdate) {
        await this.updateRecipe(recipeData);
      } else {
        await this.createRecipe(recipeData);
      }
      
      if (window.notiflix) window.notiflix.Block.remove('#recipeModal .modal-content');
      
      $("#recipeModal").modal("hide");
      
    } catch (error) {
      console.error('Error saving recipe:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#recipeModal .modal-content');
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
    }
  }
  
  getIngredientsFromForm() {
    const ingredients = [];
    
    $('.ingredient-row').each(function() {
      const name = $(this).find('.ingredient-name').val().trim();
      const qty = parseFloat($(this).find('.ingredient-qty').val()) || 0;
      const unit = $(this).find('.ingredient-unit').val();
      const cost = parseFloat($(this).find('.ingredient-cost').val()) || 0;
      
      if (name && qty > 0) {
        ingredients.push({
          ingredient_name: name,
          quantity: qty,
          unit: unit,
          cost_per_unit: cost
        });
      }
    });
    
    return ingredients;
  }
  
  getInstructionsFromForm() {
    const instructions = [];
    
    $('.instruction-row').each(function() {
      const instruction = $(this).find('.instruction-text').val().trim();
      if (instruction) {
        instructions.push(instruction);
      }
    });
    
    return instructions;
  }
}

// Make RecipesModule available globally
window.RecipesModule = RecipesModule;

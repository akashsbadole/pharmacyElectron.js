/**
 * Garment Categories Management Module
 * Provides UI for managing garment-specific product categories
 */

class GarmentCategoriesModule {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.currentView = 'categories';
        this.categories = [];
        this.selectedCategory = null;
        this.categoryTree = [];
        this.loading = false;
    }

    initialize() {
        console.log('Garment categories module initialized');
        this.setupEventListeners();
    }

    onActivate() {
        this.loadCategories();
        this.render();
    }

    onDeactivate() {
        // Clean up if needed
    }

    setupEventListeners() {
        // Handle category selection
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-category-id]')) {
                e.preventDefault();
                const categoryId = parseInt(e.target.getAttribute('data-category-id'));
                this.selectCategory(categoryId);
            }
            
            if (e.target.matches('[data-action="add-category"]')) {
                e.preventDefault();
                this.showAddCategoryModal();
            }
            
            if (e.target.matches('[data-action="edit-category"]')) {
                e.preventDefault();
                const categoryId = parseInt(e.target.getAttribute('data-category-id'));
                this.showEditCategoryModal(categoryId);
            }
            
            if (e.target.matches('[data-action="delete-category"]')) {
                e.preventDefault();
                const categoryId = parseInt(e.target.getAttribute('data-category-id'));
                this.confirmDeleteCategory(categoryId);
            }
            
            if (e.target.matches('[data-action="initialize-defaults"]')) {
                e.preventDefault();
                this.initializeDefaultCategories();
            }
        });

        // Handle form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#category-form')) {
                e.preventDefault();
                this.saveCategory(e.target);
            }
        });

        // Handle modal close
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal-close') || e.target.matches('.modal-backdrop')) {
                this.closeModal();
            }
        });

        // Handle search
        document.addEventListener('input', (e) => {
            if (e.target.matches('#category-search')) {
                this.searchCategories(e.target.value);
            }
        });
    }

    async loadCategories() {
        if (this.loading) return;
        
        this.loading = true;
        this.updateLoadingState(true);

        try {
            const response = await fetch(`${window.api}garment_categories/all`);
            if (response.ok) {
                const data = await response.json();
                this.categories = data.flat_list || [];
                this.categoryTree = data.categories || [];
            } else {
                throw new Error('Failed to load categories');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showError('Failed to load categories');
        } finally {
            this.loading = false;
            this.updateLoadingState(false);
        }
    }

    async initializeDefaultCategories() {
        try {
            this.updateLoadingState(true);
            const response = await fetch(`${window.api}garment_categories/initialize-defaults`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess(`Initialized ${result.result.total} categories successfully`);
                await this.loadCategories();
                this.render();
            } else {
                throw new Error('Failed to initialize default categories');
            }
        } catch (error) {
            console.error('Error initializing defaults:', error);
            this.showError('Failed to initialize default categories');
        } finally {
            this.updateLoadingState(false);
        }
    }

    selectCategory(categoryId) {
        this.selectedCategory = this.categories.find(cat => cat._id === categoryId);
        this.render();
    }

    showAddCategoryModal() {
        const modal = this.createCategoryModal();
        document.body.appendChild(modal);
        modal.classList.add('show');
    }

    showEditCategoryModal(categoryId) {
        const category = this.categories.find(cat => cat._id === categoryId);
        if (!category) return;

        const modal = this.createCategoryModal(category);
        document.body.appendChild(modal);
        modal.classList.add('show');
    }

    createCategoryModal(category = null) {
        const isEdit = category !== null;
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Edit' : 'Add'} Category</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="category-form" class="modal-body">
                        <input type="hidden" name="category_id" value="${category ? category._id : ''}">
                        
                        <div class="form-group">
                            <label for="category-name">Category Name *</label>
                            <input type="text" id="category-name" name="name" 
                                   value="${category ? category.name : ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="category-code">Category Code *</label>
                            <input type="text" id="category-code" name="category_code" 
                                   value="${category ? category.category_code : ''}" 
                                   ${isEdit ? 'readonly' : ''} required>
                            <small class="form-help">Unique identifier for the category</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="category-description">Description</label>
                            <textarea id="category-description" name="description" rows="3">${category ? category.description : ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="parent-category">Parent Category</label>
                            <select id="parent-category" name="parent_category">
                                <option value="">No Parent (Root Category)</option>
                                ${this.renderParentCategoryOptions(category)}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="sort-order">Sort Order</label>
                            <input type="number" id="sort-order" name="sort_order" 
                                   value="${category ? category.sort_order : 0}">
                            <small class="form-help">Lower numbers appear first</small>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="is_active" 
                                       ${!category || category.status?.is_active ? 'checked' : ''}>
                                Active Category
                            </label>
                        </div>
                        
                        <div class="garment-specific-section">
                            <h4>Garment-Specific Settings</h4>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="has_sizes" 
                                           ${category?.garment_specific?.has_sizes ? 'checked' : ''}>
                                    Track Sizes
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="has_colors" 
                                           ${category?.garment_specific?.has_colors ? 'checked' : ''}>
                                    Track Colors
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="has_materials" 
                                           ${category?.garment_specific?.has_materials ? 'checked' : ''}>
                                    Track Materials
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label for="size-chart">Size Chart</label>
                                <select id="size-chart" name="size_chart">
                                    <option value="">No Size Chart</option>
                                    <option value="mens_standard" ${category?.garment_specific?.size_chart === 'mens_standard' ? 'selected' : ''}>Men's Standard</option>
                                    <option value="womens_standard" ${category?.garment_specific?.size_chart === 'womens_standard' ? 'selected' : ''}>Women's Standard</option>
                                    <option value="kids_standard" ${category?.garment_specific?.size_chart === 'kids_standard' ? 'selected' : ''}>Kids Standard</option>
                                    <option value="footwear_standard" ${category?.garment_specific?.size_chart === 'footwear_standard' ? 'selected' : ''}>Footwear Standard</option>
                                    <option value="accessories_standard" ${category?.garment_specific?.size_chart === 'accessories_standard' ? 'selected' : ''}>Accessories Standard</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="common-sizes">Common Sizes (comma-separated)</label>
                                <input type="text" id="common-sizes" name="common_sizes" 
                                       value="${category?.garment_specific?.common_sizes?.join(', ') || ''}"
                                       placeholder="S, M, L, XL">
                            </div>
                            
                            <div class="form-group">
                                <label for="common-colors">Common Colors (comma-separated)</label>
                                <input type="text" id="common-colors" name="common_colors" 
                                       value="${category?.garment_specific?.common_colors?.join(', ') || ''}"
                                       placeholder="Black, White, Navy">
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                ${isEdit ? 'Update' : 'Create'} Category
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        return modal;
    }

    renderParentCategoryOptions(selectedCategory) {
        const options = [];
        
        // Get root categories (no parent)
        const rootCategories = this.categories.filter(cat => !cat.parent_category);
        
        rootCategories.forEach(category => {
            if (!selectedCategory || category._id !== selectedCategory._id) {
                options.push(`<option value="${category.category_code}" 
                              ${selectedCategory?.parent_category === category.category_code ? 'selected' : ''}>
                              ${category.name}</option>`);
            }
        });

        return options.join('');
    }

    async saveCategory(form) {
        const formData = new FormData(form);
        const categoryData = {
            name: formData.get('name'),
            category_code: formData.get('category_code'),
            description: formData.get('description'),
            parent_category: formData.get('parent_category') || null,
            sort_order: parseInt(formData.get('sort_order')) || 0,
            status: {
                is_active: formData.get('is_active') === 'on'
            },
            garment_specific: {
                has_sizes: formData.get('has_sizes') === 'on',
                has_colors: formData.get('has_colors') === 'on',
                has_materials: formData.get('has_materials') === 'on',
                size_chart: formData.get('size_chart') || null,
                common_sizes: formData.get('common_sizes') ? 
                    formData.get('common_sizes').split(',').map(s => s.trim()) : [],
                common_colors: formData.get('common_colors') ? 
                    formData.get('common_colors').split(',').map(c => c.trim()) : []
            }
        };

        const categoryId = formData.get('category_id');
        const isEdit = categoryId && categoryId.trim() !== '';

        try {
            const url = isEdit ? `${window.api}garment_categories/category` : `${window.api}garment_categories/category`;
            const method = isEdit ? 'PUT' : 'POST';

            if (isEdit) {
                categoryData._id = parseInt(categoryId);
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryData)
            });

            if (response.ok) {
                this.showSuccess(`Category ${isEdit ? 'updated' : 'created'} successfully`);
                this.closeModal();
                await this.loadCategories();
                this.render();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save category');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            this.showError(`Failed to save category: ${error.message}`);
        }
    }

    async confirmDeleteCategory(categoryId) {
        const category = this.categories.find(cat => cat._id === categoryId);
        if (!category) return;

        if (confirm(`Are you sure you want to delete the category "${category.name}"? This action cannot be undone.`)) {
            try {
                const response = await fetch(`${window.api}garment_categories/category/${categoryId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.showSuccess('Category deleted successfully');
                    await this.loadCategories();
                    this.render();
                } else {
                    throw new Error('Failed to delete category');
                }
            } catch (error) {
                console.error('Error deleting category:', error);
                this.showError('Failed to delete category');
            }
        }
    }

    searchCategories(searchTerm) {
        if (!searchTerm.trim()) {
            this.render();
            return;
        }

        const filtered = this.categories.filter(category =>
            category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            category.category_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        this.renderFilteredCategories(filtered);
    }

    render() {
        const analyticsState = this.app.state.getModuleState('garment_categories');
        
        return `
            <div class="module-container garment-categories-module" data-module="garment_categories">
                ${this.renderHeader()}
                ${this.renderContent()}
            </div>
        `;
    }

    renderHeader() {
        return `
            <div class="module-header">
                <h1 class="module-title">👔 Garment Categories</h1>
                <p class="module-subtitle">Manage clothing and apparel product categories</p>
                
                <div class="module-controls">
                    <div class="search-box">
                        <input type="text" id="category-search" placeholder="Search categories..." class="form-control">
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-primary" data-action="initialize-defaults">
                            <i class="fas fa-magic"></i> Initialize Defaults
                        </button>
                        <button class="btn btn-success" data-action="add-category">
                            <i class="fas fa-plus"></i> Add Category
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderContent() {
        return `
            <div class="module-content">
                ${this.renderCategoriesTree()}
                ${this.renderCategoryDetails()}
            </div>
        `;
    }

    renderCategoriesTree() {
        return `
            <div class="categories-tree-container">
                <h3>Category Hierarchy</h3>
                <div class="categories-tree">
                    ${this.renderCategoryTreeRecursive(this.categoryTree)}
                </div>
            </div>
        `;
    }

    renderCategoryTreeRecursive(categories, level = 0) {
        return categories.map(category => `
            <div class="category-tree-item level-${level}" data-category-id="${category._id}">
                <div class="category-info">
                    <span class="category-icon">
                        ${this.getCategoryIcon(category.category_code)}
                    </span>
                    <span class="category-name">${category.name}</span>
                    <span class="category-code">${category.category_code}</span>
                    ${!category.status?.is_active ? '<span class="inactive-badge">Inactive</span>' : ''}
                </div>
                <div class="category-actions">
                    <button class="btn btn-sm btn-outline-primary" data-action="edit-category" data-category-id="${category._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete-category" data-category-id="${category._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${category.children && category.children.length > 0 ? 
                `<div class="category-children">${this.renderCategoryTreeRecursive(category.children, level + 1)}</div>` : 
                ''
            }
        `).join('');
    }

    renderCategoryDetails() {
        if (!this.selectedCategory) {
            return `
                <div class="category-details empty-state">
                    <div class="empty-state-content">
                        <i class="fas fa-folder-open"></i>
                        <h3>Select a Category</h3>
                        <p>Choose a category from the tree to view details</p>
                    </div>
                </div>
            `;
        }

        const category = this.selectedCategory;
        const garmentSpec = category.garment_specific || {};

        return `
            <div class="category-details">
                <div class="category-header">
                    <h2>${category.name}</h2>
                    <div class="category-badges">
                        <span class="badge badge-primary">${category.category_code}</span>
                        <span class="badge badge-${category.status?.is_active ? 'success' : 'secondary'}">
                            ${category.status?.is_active ? 'Active' : 'Inactive'}
                        </span>
                        ${category.category_type === 'main' ? '<span class="badge badge-info">Main Category</span>' : ''}
                    </div>
                </div>

                <div class="category-info-grid">
                    <div class="info-section">
                        <h4>Basic Information</h4>
                        <dl class="info-list">
                            <dt>Description:</dt>
                            <dd>${category.description || 'No description'}</dd>
                            <dt>Parent Category:</dt>
                            <dd>${this.getParentCategoryName(category.parent_category) || 'None (Root)'}</dd>
                            <dt>Sort Order:</dt>
                            <dd>${category.sort_order}</dd>
                            <dt>Created:</dt>
                            <dd>${category.status?.created_date ? new Date(category.status.created_date).toLocaleDateString() : 'Unknown'}</dd>
                        </dl>
                    </div>

                    <div class="info-section">
                        <h4>Garment-Specific Settings</h4>
                        <dl class="info-list">
                            <dt>Track Sizes:</dt>
                            <dd>${garmentSpec.has_sizes ? 'Yes' : 'No'}</dd>
                            <dt>Track Colors:</dt>
                            <dd>${garmentSpec.has_colors ? 'Yes' : 'No'}</dd>
                            <dt>Track Materials:</dt>
                            <dd>${garmentSpec.has_materials ? 'Yes' : 'No'}</dd>
                            <dt>Size Chart:</dt>
                            <dd>${garmentSpec.size_chart || 'None'}</dd>
                            <dt>Common Sizes:</dt>
                            <dd>${garmentSpec.common_sizes?.join(', ') || 'None'}</dd>
                            <dt>Common Colors:</dt>
                            <dd>${garmentSpec.common_colors?.join(', ') || 'None'}</dd>
                        </dl>
                    </div>
                </div>

                <div class="category-actions-panel">
                    <button class="btn btn-primary" data-action="edit-category" data-category-id="${category._id}">
                        <i class="fas fa-edit"></i> Edit Category
                    </button>
                    <button class="btn btn-outline-danger" data-action="delete-category" data-category-id="${category._id}">
                        <i class="fas fa-trash"></i> Delete Category
                    </button>
                </div>
            </div>
        `;
    }

    renderFilteredCategories(filteredCategories) {
        // Update the tree view with filtered results
        const treeContainer = document.querySelector('.categories-tree');
        if (treeContainer) {
            const filteredTree = this.buildFilteredTree(filteredCategories);
            treeContainer.innerHTML = this.renderCategoryTreeRecursive(filteredTree);
        }
    }

    buildFilteredTree(categories) {
        // Build a tree structure from filtered categories
        const categoryMap = {};
        const rootCategories = [];

        categories.forEach(category => {
            categoryMap[category._id] = { ...category, children: [] };
        });

        categories.forEach(category => {
            if (category.parent_category) {
                const parent = categories.find(c => c.category_code === category.parent_category);
                if (parent) {
                    const parentObj = categoryMap[parent._id];
                    const categoryObj = categoryMap[category._id];
                    if (parentObj && categoryObj) {
                        parentObj.children.push(categoryObj);
                    }
                }
            } else {
                rootCategories.push(categoryMap[category._id]);
            }
        });

        return rootCategories;
    }

    getCategoryIcon(categoryCode) {
        const iconMap = {
            'MENS': '👔',
            'WOMENS': '👗',
            'KIDS': '🧸',
            'ACCESSORIES': '👜',
            'FOOTWEAR': '👟',
            'MENS_TOPS': '👕',
            'MENS_BOTTOMS': '👖',
            'WOMENS_TOPS': '👚',
            'WOMENS_BOTTOMS': '👖',
            'WOMENS_DRESSES': '👗',
            'BAGS': '👜',
            'JEWELRY': '💍',
            'WATCHES': '⌚',
            'HATS': '🧢',
            'SCARVES': '🧣'
        };

        return iconMap[categoryCode] || '📂';
    }

    getParentCategoryName(parentCode) {
        if (!parentCode) return null;
        const parent = this.categories.find(cat => cat.category_code === parentCode);
        return parent ? parent.name : null;
    }

    closeModal() {
        const modal = document.querySelector('.modal-backdrop');
        if (modal) {
            modal.remove();
        }
    }

    updateLoadingState(loading) {
        const loadingElements = document.querySelectorAll('.garment-categories-loading');
        loadingElements.forEach(el => {
            if (loading) {
                el.classList.add('loading');
            } else {
                el.classList.remove('loading');
            }
        });
    }

    showError(message) {
        if (window.notiflix) {
            window.notiflix.Report.failure('Error', message, 'Ok');
        }
    }

    showSuccess(message) {
        if (window.notiflix) {
            window.notiflix.Report.success('Success', message, 'Ok');
        }
    }
}

// Make GarmentCategoriesModule available globally
window.GarmentCategoriesModule = GarmentCategoriesModule;
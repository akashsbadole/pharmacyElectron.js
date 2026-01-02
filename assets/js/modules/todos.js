/**
 * Todo Management Module
 * Handles todo operations with focus on grocery/retail feature implementation
 */

class TodoModule {
  constructor(app) {
    this.app = app;
    this.api = window.api;
    this.todos = [];
    this.filteredTodos = [];
    this.currentFilter = {
      status: 'all',
      category: 'all',
      priority: 'all',
      search: ''
    };
    this.selectedTodos = new Set();
    this.isLoading = false;
    
    this.categories = [
      'Hardware Integration',
      'Core Features', 
      'Inventory Management',
      'Payment Processing',
      'Analytics',
      'Customer Management'
    ];

    this.priorities = ['Low', 'Medium', 'High', 'Critical'];
    this.statuses = ['Pending', 'In Progress', 'Completed', 'On Hold'];

    this.init();
  }

  init() {
    console.log('Initializing Todo Module...');
    this.setupEventListeners();
    this.loadTodos();
  }

  setupEventListeners() {
    // Todo creation form
    const createTodoForm = document.getElementById('createTodoForm');
    if (createTodoForm) {
      createTodoForm.addEventListener('submit', (e) => this.handleCreateTodo(e));
    }

    // Filter handlers
    document.addEventListener('change', (e) => {
      if (e.target.matches('#todoStatusFilter, #todoCategoryFilter, #todoPriorityFilter')) {
        this.handleFilterChange(e.target);
      }
    });

    // Search handler
    const todoSearchInput = document.getElementById('todoSearchInput');
    if (todoSearchInput) {
      let searchTimeout;
      todoSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 300);
      });
    }

    // Bulk actions
    document.addEventListener('click', (e) => {
      if (e.target.matches('#bulkCompleteBtn')) {
        this.handleBulkComplete();
      } else if (e.target.matches('#bulkDeleteBtn')) {
        this.handleBulkDelete();
      } else if (e.target.matches('#selectAllTodos')) {
        this.handleSelectAll(e.target);
      }
    });

    // Todo item actions
    document.addEventListener('click', (e) => {
      const todoItem = e.target.closest('.todo-item');
      if (!todoItem) return;

      const todoId = todoItem.dataset.todoId;
      
      if (e.target.matches('.todo-checkbox')) {
        this.handleTodoSelection(todoId, e.target.checked);
      } else if (e.target.matches('.todo-edit-btn')) {
        this.handleEditTodo(todoId);
      } else if (e.target.matches('.todo-delete-btn')) {
        this.handleDeleteTodo(todoId);
      } else if (e.target.matches('.todo-complete-btn')) {
        this.handleCompleteTodo(todoId);
      } else if (e.target.matches('.todo-progress-bar')) {
        this.handleProgressUpdate(todoId, e);
      }
    });

    // Modal handlers
    document.addEventListener('click', (e) => {
      if (e.target.matches('#newTodoBtn') || e.target.matches('#newTodoModal')) {
        this.showCreateTodoModal();
      } else if (e.target.matches('#todosModal')) {
        this.handleNavigateToTodos();
      } else if (e.target.matches('.todo-view-btn')) {
        const todoId = e.target.closest('.todo-item').dataset.todoId;
        this.showTodoDetails(todoId);
      } else if (e.target.matches('#editFromDetailsBtn')) {
        const todoId = document.getElementById('detailTodoTitle').dataset.todoId;
        if (todoId) {
          this.handleEditTodo(todoId);
        }
      }
    });

    // Edit form submission
    const editTodoForm = document.getElementById('editTodoForm');
    if (editTodoForm) {
      editTodoForm.addEventListener('submit', (e) => this.handleUpdateTodo(e));
    }
  }

  async loadTodos() {
    try {
      this.setLoading(true);
      const response = await fetch(`${this.api}todos?limit=100`);
      const data = await response.json();
      
      this.todos = data.todos;
      this.filteredTodos = [...this.todos];
      this.renderTodos();
      this.updateStats();
      
    } catch (error) {
      console.error('Error loading todos:', error);
      this.showError('Failed to load todos');
    } finally {
      this.setLoading(false);
    }
  }

  async handleCreateTodo(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const todoData = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      priority: formData.get('priority'),
      tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [],
      dueDate: formData.get('dueDate'),
      estimatedHours: parseInt(formData.get('estimatedHours')) || null
    };

    try {
      const response = await fetch(`${this.api}todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(todoData)
      });

      if (response.ok) {
        const newTodo = await response.json();
        this.todos.unshift(newTodo);
        this.applyFilters();
        this.renderTodos();
        this.updateStats();
        this.hideCreateTodoModal();
        this.showSuccess('Todo created successfully');
      } else {
        throw new Error('Failed to create todo');
      }
    } catch (error) {
      console.error('Error creating todo:', error);
      this.showError('Failed to create todo');
    }
  }

  async handleEditTodo(todoId) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return;

    // Populate edit form
    document.getElementById('editTodoId').value = todo.id;
    document.getElementById('editTodoTitle').value = todo.title;
    document.getElementById('editTodoDescription').value = todo.description;
    document.getElementById('editTodoCategory').value = todo.category;
    document.getElementById('editTodoPriority').value = todo.priority;
    document.getElementById('editTodoStatus').value = todo.status;
    document.getElementById('editTodoTags').value = todo.tags.join(', ');
    document.getElementById('editTodoDueDate').value = todo.dueDate ? todo.dueDate.split('T')[0] : '';
    document.getElementById('editTodoEstimatedHours').value = todo.estimatedHours || '';
    document.getElementById('editTodoProgress').value = todo.progress;

    // Show edit modal
    const editModal = new bootstrap.Modal(document.getElementById('editTodoModal'));
    editModal.show();
  }

  handleNavigateToTodos() {
    if (window.pharmaApp) {
      window.pharmaApp.switchToModule('todos');
    }
  }

  async handleUpdateTodo(e) {
    e.preventDefault();
    
    const todoId = document.getElementById('editTodoId').value;
    const formData = new FormData(e.target);
    
    const updates = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      priority: formData.get('priority'),
      status: formData.get('status'),
      tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [],
      dueDate: formData.get('dueDate') || null,
      estimatedHours: parseInt(formData.get('estimatedHours')) || null,
      progress: parseInt(formData.get('progress')) || 0
    };

    try {
      const response = await fetch(`${this.api}todos/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedTodo = await response.json();
        const index = this.todos.findIndex(t => t.id === todoId);
        if (index !== -1) {
          this.todos[index] = updatedTodo;
        }
        this.applyFilters();
        this.renderTodos();
        this.updateStats();
        
        // Hide modal
        const editModal = bootstrap.Modal.getInstance(document.getElementById('editTodoModal'));
        editModal.hide();
        
        this.showSuccess('Todo updated successfully');
      } else {
        throw new Error('Failed to update todo');
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      this.showError('Failed to update todo');
    }
  }

  async handleDeleteTodo(todoId) {
    if (!confirm('Are you sure you want to delete this todo?')) return;

    try {
      const response = await fetch(`${this.api}todos/${todoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.todos = this.todos.filter(t => t.id !== todoId);
        this.applyFilters();
        this.renderTodos();
        this.updateStats();
        this.showSuccess('Todo deleted successfully');
      } else {
        throw new Error('Failed to delete todo');
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      this.showError('Failed to delete todo');
    }
  }

  async handleCompleteTodo(todoId) {
    try {
      const response = await fetch(`${this.api}todos/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: 'Completed',
          progress: 100
        })
      });

      if (response.ok) {
        const updatedTodo = await response.json();
        const index = this.todos.findIndex(t => t.id === todoId);
        if (index !== -1) {
          this.todos[index] = updatedTodo;
        }
        this.applyFilters();
        this.renderTodos();
        this.updateStats();
        this.showSuccess('Todo marked as completed');
      } else {
        throw new Error('Failed to complete todo');
      }
    } catch (error) {
      console.error('Error completing todo:', error);
      this.showError('Failed to complete todo');
    }
  }

  async handleProgressUpdate(todoId, e) {
    const progressBar = e.target;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.round((clickX / rect.width) * 100);

    try {
      const response = await fetch(`${this.api}todos/${todoId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ progress: percentage })
      });

      if (response.ok) {
        const updatedTodo = await response.json();
        const index = this.todos.findIndex(t => t.id === todoId);
        if (index !== -1) {
          this.todos[index] = updatedTodo;
        }
        this.renderTodos();
        this.updateStats();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  handleFilterChange(filterElement) {
    const filterType = filterElement.id.replace('Todo', '').replace('Filter', '').toLowerCase();
    this.currentFilter[filterType] = filterElement.value;
    this.applyFilters();
    this.renderTodos();
  }

  handleSearch(searchTerm) {
    this.currentFilter.search = searchTerm;
    this.applyFilters();
    this.renderTodos();
  }

  applyFilters() {
    this.filteredTodos = this.todos.filter(todo => {
      // Status filter
      if (this.currentFilter.status !== 'all' && todo.status !== this.currentFilter.status) {
        return false;
      }

      // Category filter
      if (this.currentFilter.category !== 'all' && todo.category !== this.currentFilter.category) {
        return false;
      }

      // Priority filter
      if (this.currentFilter.priority !== 'all' && todo.priority !== this.currentFilter.priority) {
        return false;
      }

      // Search filter
      if (this.currentFilter.search) {
        const searchTerm = this.currentFilter.search.toLowerCase();
        const matchesSearch = 
          todo.title.toLowerCase().includes(searchTerm) ||
          todo.description.toLowerCase().includes(searchTerm) ||
          todo.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        
        if (!matchesSearch) return false;
      }

      return true;
    });
  }

  handleTodoSelection(todoId, selected) {
    if (selected) {
      this.selectedTodos.add(todoId);
    } else {
      this.selectedTodos.delete(todoId);
    }
    
    this.updateBulkActionsVisibility();
  }

  handleSelectAll(selectAllCheckbox) {
    const isChecked = selectAllCheckbox.checked;
    
    if (isChecked) {
      this.filteredTodos.forEach(todo => this.selectedTodos.add(todo.id));
    } else {
      this.selectedTodos.clear();
    }
    
    this.renderTodos();
    this.updateBulkActionsVisibility();
  }

  async handleBulkComplete() {
    if (this.selectedTodos.size === 0) return;

    try {
      const response = await fetch(`${this.api}todos/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          todoIds: Array.from(this.selectedTodos),
          updates: { status: 'Completed', progress: 100 }
        })
      });

      if (response.ok) {
        // Reload todos to get updated data
        await this.loadTodos();
        this.selectedTodos.clear();
        this.updateBulkActionsVisibility();
        this.showSuccess(`${this.selectedTodos.size} todos marked as completed`);
      }
    } catch (error) {
      console.error('Error bulk completing todos:', error);
      this.showError('Failed to complete selected todos');
    }
  }

  async handleBulkDelete() {
    if (this.selectedTodos.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${this.selectedTodos.size} todos?`)) return;

    try {
      const deletePromises = Array.from(this.selectedTodos).map(todoId => 
        fetch(`${this.api}todos/${todoId}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      
      // Reload todos to get updated data
      await this.loadTodos();
      this.selectedTodos.clear();
      this.updateBulkActionsVisibility();
      this.showSuccess('Selected todos deleted successfully');
    } catch (error) {
      console.error('Error bulk deleting todos:', error);
      this.showError('Failed to delete selected todos');
    }
  }

  updateBulkActionsVisibility() {
    const bulkActions = document.getElementById('bulkActions');
    if (bulkActions) {
      bulkActions.style.display = this.selectedTodos.size > 0 ? 'block' : 'none';
    }
  }

  renderTodos() {
    const container = document.getElementById('todoList');
    if (!container) return;

    if (this.filteredTodos.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-4">
          <div class="alert alert-info">
            <i class="fa fa-info-circle"></i>
            ${this.todos.length === 0 ? 'No todos created yet.' : 'No todos match the current filters.'}
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredTodos.map(todo => this.renderTodoItem(todo)).join('');
  }

  renderTodoItem(todo) {
    const isSelected = this.selectedTodos.has(todo.id);
    const priorityClass = {
      'Low': 'success',
      'Medium': 'warning', 
      'High': 'danger',
      'Critical': 'dark'
    }[todo.priority] || 'secondary';

    const statusBadge = {
      'Pending': 'secondary',
      'In Progress': 'primary',
      'Completed': 'success',
      'On Hold': 'warning'
    }[todo.status] || 'secondary';

    return `
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="card todo-item ${isSelected ? 'border-primary' : ''}" data-todo-id="${todo.id}">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div class="form-check">
              <input class="form-check-input todo-checkbox" type="checkbox" ${isSelected ? 'checked' : ''}>
              <span class="badge badge-${priorityClass}">${todo.priority}</span>
            </div>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-primary todo-view-btn" title="View Details">
                <i class="fa fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-outline-secondary todo-edit-btn" title="Edit">
                <i class="fa fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-outline-success todo-complete-btn" title="Complete" ${todo.status === 'Completed' ? 'disabled' : ''}>
                <i class="fa fa-check"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger todo-delete-btn" title="Delete">
                <i class="fa fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="card-body">
            <h6 class="card-title">${todo.title}</h6>
            <p class="card-text small text-muted">${this.truncateText(todo.description, 100)}</p>
            
            <div class="mb-2">
              <span class="badge badge-${statusBadge}">${todo.status}</span>
              <small class="text-muted ml-2">${todo.category}</small>
            </div>

            ${todo.tags.length > 0 ? `
              <div class="mb-2">
                ${todo.tags.map(tag => `<span class="badge badge-light">${tag}</span>`).join(' ')}
              </div>
            ` : ''}

            <div class="progress mb-2" style="height: 6px;">
              <div class="progress-bar todo-progress-bar" 
                   role="progressbar" 
                   style="width: ${todo.progress}%"
                   data-progress="${todo.progress}">
              </div>
            </div>
            <small class="text-muted">Progress: ${todo.progress}%</small>

            ${todo.estimatedHours ? `
              <small class="text-muted d-block">
                <i class="fa fa-clock-o"></i> ${todo.estimatedHours}h estimated
              </small>
            ` : ''}

            ${todo.dueDate ? `
              <small class="text-muted d-block">
                <i class="fa fa-calendar"></i> Due: ${this.formatDate(todo.dueDate)}
              </small>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  updateStats() {
    const stats = this.calculateStats();
    
    // Update stat cards
    const elements = {
      totalTodos: document.getElementById('totalTodos'),
      pendingTodos: document.getElementById('pendingTodos'),
      inProgressTodos: document.getElementById('inProgressTodos'),
      completedTodos: document.getElementById('completedTodos'),
      completionRate: document.getElementById('completionRate')
    };

    Object.keys(elements).forEach(key => {
      if (elements[key]) {
        elements[key].textContent = stats[key] || 0;
      }
    });

    // Update progress bars
    this.updateProgressBars(stats);
  }

  calculateStats() {
    const total = this.todos.length;
    const pending = this.todos.filter(t => t.status === 'Pending').length;
    const inProgress = this.todos.filter(t => t.status === 'In Progress').length;
    const completed = this.todos.filter(t => t.status === 'Completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalTodos: total,
      pendingTodos: pending,
      inProgressTodos: inProgress,
      completedTodos: completed,
      completionRate: completionRate
    };
  }

  updateProgressBars(stats) {
    const progressBar = document.getElementById('overallProgressBar');
    if (progressBar) {
      progressBar.style.width = `${stats.completionRate}%`;
      progressBar.setAttribute('aria-valuenow', stats.completionRate);
    }

    const progressText = document.getElementById('overallProgressText');
    if (progressText) {
      progressText.textContent = `${stats.completionRate}% Complete`;
    }
  }

  showCreateTodoModal() {
    const modal = new bootstrap.Modal(document.getElementById('createTodoModal'));
    modal.show();
  }

  hideCreateTodoModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('createTodoModal'));
    if (modal) modal.hide();
  }

  showTodoDetails(todoId) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return;

    // Populate details modal
    document.getElementById('detailTodoTitle').textContent = todo.title;
    document.getElementById('detailTodoDescription').textContent = todo.description;
    document.getElementById('detailTodoCategory').textContent = todo.category;
    document.getElementById('detailTodoPriority').textContent = todo.priority;
    document.getElementById('detailTodoStatus').textContent = todo.status;
    document.getElementById('detailTodoProgress').textContent = `${todo.progress}%`;
    document.getElementById('detailTodoCreated').textContent = this.formatDate(todo.createdAt);
    document.getElementById('detailTodoUpdated').textContent = this.formatDate(todo.updatedAt);

    if (todo.dueDate) {
      document.getElementById('detailTodoDueDate').textContent = this.formatDate(todo.dueDate);
      document.getElementById('detailTodoDueDate').parentElement.style.display = 'block';
    } else {
      document.getElementById('detailTodoDueDate').parentElement.style.display = 'none';
    }

    if (todo.estimatedHours) {
      document.getElementById('detailTodoEstimated').textContent = `${todo.estimatedHours} hours`;
      document.getElementById('detailTodoEstimated').parentElement.style.display = 'block';
    } else {
      document.getElementById('detailTodoEstimated').parentElement.style.display = 'none';
    }

    // Show tags
    const tagsContainer = document.getElementById('detailTodoTags');
    if (todo.tags.length > 0) {
      tagsContainer.innerHTML = todo.tags.map(tag => `<span class="badge badge-secondary mr-1">${tag}</span>`).join('');
      tagsContainer.parentElement.style.display = 'block';
    } else {
      tagsContainer.parentElement.style.display = 'none';
    }

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('todoDetailsModal'));
    modal.show();
  }

  setLoading(loading) {
    this.isLoading = loading;
    const loadingElements = document.querySelectorAll('.todo-loading');
    
    loadingElements.forEach(element => {
      element.style.display = loading ? 'block' : 'none';
    });
  }

  showSuccess(message) {
    if (window.Notiflix) {
      Notiflix.Notify.success(message);
    }
  }

  showError(message) {
    if (window.Notiflix) {
      Notiflix.Notify.failure(message);
    }
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Module activation handler
  onActivate() {
    this.loadTodos();
  }

  // Cleanup handler
  onDeactivate() {
    this.selectedTodos.clear();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TodoModule;
}
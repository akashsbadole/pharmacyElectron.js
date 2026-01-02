/**
 * Todo Management API
 * Handles CRUD operations for todos with focus on grocery/retail features
 */

const express = require('express');
const router = express.Router();

// Mock database - in production, this would connect to your actual database
let todos = [
  {
    id: '1',
    title: 'Scale Integration Setup',
    description: 'Direct connection to scales for automatic weight capture and pricing (produce, deli, bulk); support in-counter or countertop scales.',
    category: 'Hardware Integration',
    priority: 'High',
    status: 'Pending',
    tags: ['scale', 'hardware', 'weight', 'pricing'],
    assignedTo: null,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: null,
    estimatedHours: 16,
    completedAt: null,
    dependencies: [],
    progress: 0
  },
  {
    id: '2',
    title: 'Weight/Loose Units Implementation',
    description: 'Sell by kg, grams, pieces; tare weight support for containers.',
    category: 'Core Features',
    priority: 'High',
    status: 'Pending',
    tags: ['weight', 'units', 'tare', 'pricing'],
    assignedTo: null,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: null,
    estimatedHours: 12,
    completedAt: null,
    dependencies: ['1'],
    progress: 0
  },
  {
    id: '3',
    title: 'Barcode and PLU Support',
    description: 'Fast scanning; Price Look-Up (PLU) for non-barcoded items.',
    category: 'Core Features',
    priority: 'High',
    status: 'Pending',
    tags: ['barcode', 'plu', 'scanning', 'items'],
    assignedTo: null,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: null,
    estimatedHours: 20,
    completedAt: null,
    dependencies: [],
    progress: 0
  },
  {
    id: '4',
    title: 'Real-Time Inventory Updates',
    description: 'Auto-deduct on sale; multi-location stock check.',
    category: 'Inventory Management',
    priority: 'High',
    status: 'Pending',
    tags: ['inventory', 'real-time', 'stock', 'deduction'],
    assignedTo: null,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: null,
    estimatedHours: 24,
    completedAt: null,
    dependencies: ['2', '3'],
    progress: 0
  },
  {
    id: '5',
    title: 'Bulk and Random-Weight Items',
    description: 'Handle deli meats, produce, grains accurately.',
    category: 'Core Features',
    priority: 'Medium',
    status: 'Pending',
    tags: ['bulk', 'random-weight', 'deli', 'produce'],
    assignedTo: null,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: null,
    estimatedHours: 18,
    completedAt: null,
    dependencies: ['2'],
    progress: 0
  },
  {
    id: '6',
    title: 'EBT/SNAP and Multi-Payment Support',
    description: 'Support food stamps, various payments.',
    category: 'Payment Processing',
    priority: 'Medium',
    status: 'Pending',
    tags: ['ebt', 'snap', 'payments', 'food-stamps'],
    assignedTo: null,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: null,
    estimatedHours: 30,
    completedAt: null,
    dependencies: ['3', '4'],
    progress: 0
  },
  {
    id: '7',
    title: 'Low Stock and Reordering',
    description: 'Automated alerts; purchase orders.',
    category: 'Inventory Management',
    priority: 'Medium',
    status: 'Pending',
    tags: ['low-stock', 'reordering', 'alerts', 'purchase-orders'],
    assignedTo: null,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: null,
    estimatedHours: 15,
    completedAt: null,
    dependencies: ['4'],
    progress: 0
  },
  {
    id: '8',
    title: 'Shrink and Loss Prevention',
    description: 'Reports for inventory discrepancies.',
    category: 'Analytics',
    priority: 'Low',
    status: 'Pending',
    tags: ['shrink', 'loss-prevention', 'reports', 'discrepancies'],
    assignedTo: null,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: null,
    estimatedHours: 20,
    completedAt: null,
    dependencies: ['4', '7'],
    progress: 0
  },
  {
    id: '9',
    title: 'Customer Loyalty Program',
    description: 'Points, discounts for regulars. (Basic features only)',
    category: 'Customer Management',
    priority: 'Low',
    status: 'Pending',
    tags: ['loyalty', 'points', 'discounts', 'customers'],
    assignedTo: null,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: null,
    estimatedHours: 25,
    completedAt: null,
    dependencies: ['3', '4'],
    progress: 0
  },
  {
    id: '10',
    title: 'Detailed Reporting',
    description: 'Sales by department, peak times, profit margins.',
    category: 'Analytics',
    priority: 'Medium',
    status: 'Pending',
    tags: ['reporting', 'department', 'peak-times', 'profit-margins'],
    assignedTo: null,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: null,
    estimatedHours: 22,
    completedAt: null,
    dependencies: ['4', '6'],
    progress: 0
  }
];

// Get all todos with filtering and pagination
router.get('/', (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      tags,
      assignedTo,
      page = 1,
      limit = 50,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let filteredTodos = [...todos];

    // Apply filters
    if (status) {
      filteredTodos = filteredTodos.filter(todo => 
        todo.status.toLowerCase() === status.toLowerCase()
      );
    }

    if (category) {
      filteredTodos = filteredTodos.filter(todo => 
        todo.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (priority) {
      filteredTodos = filteredTodos.filter(todo => 
        todo.priority.toLowerCase() === priority.toLowerCase()
      );
    }

    if (assignedTo) {
      filteredTodos = filteredTodos.filter(todo => 
        todo.assignedTo === assignedTo
      );
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      filteredTodos = filteredTodos.filter(todo => 
        tagArray.some(tag => 
          todo.tags.some(todoTag => todoTag.toLowerCase().includes(tag))
        )
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredTodos = filteredTodos.filter(todo => 
        todo.title.toLowerCase().includes(searchLower) ||
        todo.description.toLowerCase().includes(searchLower) ||
        todo.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort todos
    filteredTodos.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTodos = filteredTodos.slice(startIndex, endIndex);

    res.json({
      todos: paginatedTodos,
      totalCount: filteredTodos.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredTodos.length / limit),
      hasNextPage: endIndex < filteredTodos.length,
      hasPrevPage: startIndex > 0
    });

  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// Get todo by ID
router.get('/:id', (req, res) => {
  try {
    const todo = todos.find(t => t.id === req.params.id);
    
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json(todo);
  } catch (error) {
    console.error('Error fetching todo:', error);
    res.status(500).json({ error: 'Failed to fetch todo' });
  }
});

// Create new todo
router.post('/', (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority = 'Medium',
      status = 'Pending',
      tags = [],
      assignedTo,
      dueDate,
      estimatedHours,
      dependencies = []
    } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({ 
        error: 'Title and description are required' 
      });
    }

    const newTodo = {
      id: Date.now().toString(),
      title,
      description,
      category,
      priority,
      status,
      tags,
      assignedTo,
      createdBy: req.user?.id || 'unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate,
      estimatedHours,
      completedAt: null,
      dependencies,
      progress: status === 'Completed' ? 100 : 0
    };

    todos.push(newTodo);

    res.status(201).json(newTodo);
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// Update todo
router.put('/:id', (req, res) => {
  try {
    const todoIndex = todos.findIndex(t => t.id === req.params.id);
    
    if (todoIndex === -1) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const currentTodo = todos[todoIndex];
    const updates = req.body;

    // Update the todo
    const updatedTodo = {
      ...currentTodo,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Set completion date if status changed to completed
    if (currentTodo.status !== 'Completed' && updates.status === 'Completed') {
      updatedTodo.completedAt = new Date().toISOString();
      updatedTodo.progress = 100;
    } else if (updates.status !== 'Completed') {
      updatedTodo.completedAt = null;
      updatedTodo.progress = updates.progress || currentTodo.progress;
    }

    todos[todoIndex] = updatedTodo;

    res.json(updatedTodo);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// Delete todo
router.delete('/:id', (req, res) => {
  try {
    const todoIndex = todos.findIndex(t => t.id === req.params.id);
    
    if (todoIndex === -1) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    todos.splice(todoIndex, 1);

    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// Update todo progress
router.patch('/:id/progress', (req, res) => {
  try {
    const { progress } = req.body;
    
    if (progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'Progress must be between 0 and 100' });
    }

    const todoIndex = todos.findIndex(t => t.id === req.params.id);
    
    if (todoIndex === -1) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const currentTodo = todos[todoIndex];
    const updatedTodo = {
      ...currentTodo,
      progress,
      updatedAt: new Date().toISOString()
    };

    // Auto-update status based on progress
    if (progress === 100 && currentTodo.status !== 'Completed') {
      updatedTodo.status = 'Completed';
      updatedTodo.completedAt = new Date().toISOString();
    } else if (progress > 0 && currentTodo.status === 'Pending') {
      updatedTodo.status = 'In Progress';
    }

    todos[todoIndex] = updatedTodo;

    res.json(updatedTodo);
  } catch (error) {
    console.error('Error updating todo progress:', error);
    res.status(500).json({ error: 'Failed to update todo progress' });
  }
});

// Get todo statistics
router.get('/stats/summary', (req, res) => {
  try {
    const stats = {
      total: todos.length,
      pending: todos.filter(t => t.status === 'Pending').length,
      inProgress: todos.filter(t => t.status === 'In Progress').length,
      completed: todos.filter(t => t.status === 'Completed').length,
      byCategory: {},
      byPriority: {},
      overdue: 0,
      completionRate: 0
    };

    // Category breakdown
    todos.forEach(todo => {
      stats.byCategory[todo.category] = (stats.byCategory[todo.category] || 0) + 1;
      stats.byPriority[todo.priority] = (stats.byPriority[todo.priority] || 0) + 1;
    });

    // Overdue todos
    const now = new Date();
    stats.overdue = todos.filter(todo => 
      todo.dueDate && new Date(todo.dueDate) < now && todo.status !== 'Completed'
    ).length;

    // Completion rate
    stats.completionRate = stats.total > 0 
      ? Math.round((stats.completed / stats.total) * 100) 
      : 0;

    res.json(stats);
  } catch (error) {
    console.error('Error fetching todo stats:', error);
    res.status(500).json({ error: 'Failed to fetch todo statistics' });
  }
});

// Bulk update todos
router.patch('/bulk', (req, res) => {
  try {
    const { todoIds, updates } = req.body;

    if (!todoIds || !Array.isArray(todoIds) || todoIds.length === 0) {
      return res.status(400).json({ error: 'todoIds array is required' });
    }

    const updatedTodos = [];

    todoIds.forEach(id => {
      const todoIndex = todos.findIndex(t => t.id === id);
      if (todoIndex !== -1) {
        const currentTodo = todos[todoIndex];
        const updatedTodo = {
          ...currentTodo,
          ...updates,
          updatedAt: new Date().toISOString()
        };

        todos[todoIndex] = updatedTodo;
        updatedTodos.push(updatedTodo);
      }
    });

    res.json({
      message: `${updatedTodos.length} todos updated successfully`,
      updatedTodos
    });
  } catch (error) {
    console.error('Error bulk updating todos:', error);
    res.status(500).json({ error: 'Failed to bulk update todos' });
  }
});

module.exports = router;
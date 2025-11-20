document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const categoryItems = document.querySelectorAll('.category-item');
    const totalTasksEl = document.getElementById('totalTasks');
    const pendingTasksEl = document.getElementById('pendingTasks');
    const completedTasksEl = document.getElementById('completedTasks');
    const quickPendingEl = document.getElementById('quickPending');
    const quickCompletedEl = document.getElementById('quickCompleted');
    const searchInput = document.getElementById('searchInput');
    
    // Edit Modal Elements
    const editModal = document.getElementById('editModal');
    const editTaskInput = document.getElementById('editTaskInput');
    const editTaskCategory = document.getElementById('editTaskCategory');
    const editTaskPriority = document.getElementById('editTaskPriority');
    const editTaskDueDate = document.getElementById('editTaskDueDate');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const closeModal = document.querySelector('.close');
    
    // Task Options
    const taskCategory = document.getElementById('taskCategory');
    const taskPriority = document.getElementById('taskPriority');
    const taskDueDate = document.getElementById('taskDueDate');
    
    // State
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all';
    let currentCategory = 'all';
    let currentEditIndex = null;
    let searchQuery = '';
    
    // Initialize the app
    function init() {
        renderTasks();
        updateStats();
        
        // Event Listeners
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask();
        });
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.getAttribute('data-filter');
                renderTasks();
            });
        });
        
        categoryItems.forEach(item => {
            item.addEventListener('click', function() {
                categoryItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.getAttribute('data-category');
                renderTasks();
            });
        });
        
        searchInput.addEventListener('input', function() {
            searchQuery = this.value.toLowerCase();
            renderTasks();
        });
        
        saveEditBtn.addEventListener('click', saveEdit);
        cancelEditBtn.addEventListener('click', closeEditModal);
        closeModal.addEventListener('click', closeEditModal);
        
        // Close modal when clicking outside
        window.addEventListener('click', function(e) {
            if (e.target === editModal) {
                closeEditModal();
            }
        });
        
        // Set minimum date to today for due date inputs
        const today = new Date().toISOString().split('T')[0];
        taskDueDate.min = today;
        editTaskDueDate.min = today;
    }
    
    // Add a new task
    function addTask() {
        const taskText = taskInput.value.trim();
        
        if (taskText === '') {
            alert('Please enter a task!');
            return;
        }
        
        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            category: taskCategory.value,
            priority: taskPriority.value,
            dueDate: taskDueDate.value || null,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        
        taskInput.value = '';
        saveTasks();
        renderTasks();
        updateStats();
    }
    
    // Render tasks based on current filter, category, and search
    function renderTasks() {
        taskList.innerHTML = '';
        
        let filteredTasks = tasks.filter(task => {
            // Apply filter (all, pending, completed)
            if (currentFilter === 'pending' && task.completed) return false;
            if (currentFilter === 'completed' && !task.completed) return false;
            
            // Apply category filter
            if (currentCategory !== 'all' && task.category !== currentCategory) return false;
            
            // Apply search filter
            if (searchQuery && !task.text.toLowerCase().includes(searchQuery)) return false;
            
            return true;
        });
        
        if (filteredTasks.length === 0) {
            emptyState.style.display = 'block';
            taskList.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            taskList.style.display = 'block';
            
            // Sort tasks: incomplete first, then by priority (high to low), then by creation date
            filteredTasks.sort((a, b) => {
                if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1;
                }
                
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                }
                
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            
            filteredTasks.forEach((task, index) => {
                const originalIndex = tasks.findIndex(t => t.id === task.id);
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item';
                
                // Format due date for display
                let dueDateDisplay = 'No due date';
                if (task.dueDate) {
                    const dueDate = new Date(task.dueDate);
                    dueDateDisplay = dueDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                    });
                    
                    // Add overdue styling if due date has passed
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (dueDate < today && !task.completed) {
                        taskItem.style.borderLeft = '4px solid var(--warning)';
                    }
                }
                
                taskItem.innerHTML = `
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <div class="task-content">
                        <div class="task-text ${task.completed ? 'completed' : ''}">${task.text}</div>
                        <div class="task-meta">
                            <span class="task-priority ${'priority-' + task.priority}">
                                <i class="fas fa-flag"></i> ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                            <span class="task-category">
                                <i class="fas fa-tag"></i> ${task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                            </span>
                            <span class="task-date">
                                <i class="fas fa-calendar"></i> ${dueDateDisplay}
                            </span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="edit-btn"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                // Add event listeners to the task item
                const checkbox = taskItem.querySelector('.task-checkbox');
                const editBtn = taskItem.querySelector('.edit-btn');
                const deleteBtn = taskItem.querySelector('.delete-btn');
                
                checkbox.addEventListener('change', function() {
                    toggleTask(originalIndex);
                });
                
                editBtn.addEventListener('click', function() {
                    openEditModal(originalIndex);
                });
                
                deleteBtn.addEventListener('click', function() {
                    deleteTask(originalIndex);
                });
                
                taskList.appendChild(taskItem);
            });
        }
    }
    
    // Toggle task completion status
    function toggleTask(index) {
        tasks[index].completed = !tasks[index].completed;
        tasks[index].completedAt = tasks[index].completed ? new Date().toISOString() : null;
        saveTasks();
        renderTasks();
        updateStats();
    }
    
    // Delete a task
    function deleteTask(index) {
        if (confirm('Are you sure you want to delete this task?')) {
            tasks.splice(index, 1);
            saveTasks();
            renderTasks();
            updateStats();
        }
    }
    
    // Open edit modal
    function openEditModal(index) {
        currentEditIndex = index;
        const task = tasks[index];
        
        editTaskInput.value = task.text;
        editTaskCategory.value = task.category;
        editTaskPriority.value = task.priority;
        editTaskDueDate.value = task.dueDate || '';
        
        editModal.style.display = 'block';
    }
    
    // Close edit modal
    function closeEditModal() {
        editModal.style.display = 'none';
        currentEditIndex = null;
    }
    
    // Save edited task
    function saveEdit() {
        if (currentEditIndex === null) return;
        
        const newText = editTaskInput.value.trim();
        
        if (newText === '') {
            alert('Task cannot be empty!');
            return;
        }
        
        tasks[currentEditIndex].text = newText;
        tasks[currentEditIndex].category = editTaskCategory.value;
        tasks[currentEditIndex].priority = editTaskPriority.value;
        tasks[currentEditIndex].dueDate = editTaskDueDate.value || null;
        
        saveTasks();
        renderTasks();
        closeEditModal();
    }
    
    // Update task statistics
    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const pending = total - completed;
        
        totalTasksEl.textContent = total;
        completedTasksEl.textContent = completed;
        pendingTasksEl.textContent = pending;
        
        quickPendingEl.textContent = pending;
        quickCompletedEl.textContent = completed;
    }
    
    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    // Initialize the app
    init();
});
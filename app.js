// ==========================================================
// 1. SELECTORES DE ELEMENTOS DEL DOM
// ==========================================================

const $levelSelectionScreen = document.getElementById('level-selection');
const $levelsList = document.getElementById('levels-list');
const $levelViewScreen = document.getElementById('level-view');
const $levelTitle = document.getElementById('level-title');
const $levelQuestion = document.getElementById('level-question');
const $circuitImage = document.getElementById('circuit-image');
const $optionsContainer = document.getElementById('options-container');
const $feedbackArea = document.getElementById('feedback-area');
const $feedbackText = document.getElementById('feedback-text');
const $nextActionButton = document.getElementById('next-action');
const $backToLevelsButton = document.getElementById('back-to-levels');

// Selectores para la Alerta de Cortocircuito
const $shortAlert = document.getElementById('short-alert');
const $closeShortButton = document.getElementById('close-short');


// ==========================================================
// 2. CONFIGURACIÓN INICIAL Y ESTADO DEL JUEGO (DINÁMICO)
// ==========================================================

// allLevels ahora almacenará el OBJETO de categorías cargado del índice JSON
let allLevels = {}; 
let currentLevelData = null; 
const COMPLETED_LEVELS_KEY = 'completedLevels'; 
const LEVELS_INDEX_PATH = 'levels/levels_index.json'; // Ruta al índice maestro


// ==========================================================
// 3. FUNCIONES DE RENDERIZADO Y NAVEGACIÓN
// ==========================================================

/**
 * Muestra la pantalla de selección de niveles y oculta la vista de nivel.
 */
function showLevelSelection() {
    $levelSelectionScreen.classList.remove('hidden');
    $levelViewScreen.classList.add('hidden');
    $feedbackArea.classList.add('hidden');
    $nextActionButton.classList.add('hidden');
}

/**
 * Muestra la vista de nivel y oculta la selección.
 * @param {Object} levelData - Datos del nivel JSON a mostrar.
 */
function showLevelView(levelData) {
    currentLevelData = levelData;
    $levelTitle.textContent = levelData.title;
    $levelQuestion.textContent = levelData.question;
    $circuitImage.src = levelData.image;
    $circuitImage.alt = `Diagrama de circuito: ${levelData.title}`;

    // Limpiar y renderizar opciones
    $optionsContainer.innerHTML = '';
    levelData.options.forEach(opt => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = opt.text;
        button.dataset.optionId = opt.id;
        button.addEventListener('click', () => handleOptionSelect(opt, button));
        $optionsContainer.appendChild(button);
    });

    $levelSelectionScreen.classList.add('hidden');
    $levelViewScreen.classList.remove('hidden');
}

/**
 * Genera y muestra las tarjetas de niveles agrupadas por categorías.
 */
function renderLevelCards() {
    $levelsList.innerHTML = '';
    const completedLevels = getCompletedLevels();
    
    // 1. Itera sobre las categorías (ej: 'circuitos_serie', 'circuitos_paralelo')
    for (const categoryKey in allLevels) {
        const category = allLevels[categoryKey];
        
        // Crea el encabezado de la categoría
        const categoryHeader = document.createElement('h3');
        categoryHeader.textContent = category.title;
        categoryHeader.style.marginTop = '40px';
        categoryHeader.style.borderBottom = '2px solid var(--color-primary)';
        categoryHeader.style.paddingBottom = '5px';
        $levelsList.appendChild(categoryHeader);
        
        const categoryDesc = document.createElement('p');
        categoryDesc.textContent = category.description;
        categoryDesc.style.marginBottom = '20px';
        categoryDesc.style.opacity = '0.7';
        $levelsList.appendChild(categoryDesc);

        // Contenedor para la rejilla de niveles
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-container';
        
        // 2. Itera sobre los niveles dentro de la categoría
        category.levels.forEach(level => { 
            const card = document.createElement('div');
            card.className = 'level-card';
            card.dataset.levelId = level.id;
            card.dataset.category = categoryKey; // Guarda la categoría
            
            const isCompleted = completedLevels.includes(level.id);
            const status = isCompleted ? '✅ Completado' : '🔌 Pendiente';

            card.innerHTML = `
                <h3>${level.title}</h3>
                <p>Dificultad: ${level.difficulty}</p>
                <small>${status}</small>
            `;
            card.addEventListener('click', () => loadLevel(level.file)); 
            gridContainer.appendChild(card);
        });
        
        $levelsList.appendChild(gridContainer);
    }
}


// ==========================================================
// 4. LÓGICA DE CARGA DE DATOS (JSON)
// ==========================================================

/**
 * Carga el archivo JSON del nivel y lo renderiza.
 * @param {string} path - Ruta al archivo JSON del nivel.
 */
async function loadLevel(path) {
    try {
        const resp = await fetch(path);
        if (!resp.ok) {
            throw new Error(`Error al cargar el nivel: ${resp.statusText}`);
        }
        const levelData = await resp.json();
        showLevelView(levelData);
    } catch (error) {
        console.error("Fallo al cargar el nivel:", error);
        alert(`Error: No se pudo cargar el archivo del nivel. Verifique la ruta: ${path}`);
        showLevelSelection(); 
    }
}

/**
 * Carga el índice de niveles al iniciar la aplicación.
 */
async function loadLevelIndex() {
    try {
        const resp = await fetch(LEVELS_INDEX_PATH);
        if (!resp.ok) {
            throw new Error(`Error al cargar el índice: ${resp.statusText}`);
        }
        allLevels = await resp.json(); // Carga el objeto de categorías
        renderLevelCards();
        showLevelSelection();
    } catch (error) {
        console.error("Fallo al cargar el índice de niveles:", error);
        alert('Error: No se pudo cargar la lista de niveles. Verifique el archivo levels/levels_index.json');
    }
}


// ==========================================================
// 5. LÓGICA PRINCIPAL DEL JUEGO
// ==========================================================

/**
 * Maneja la selección de una opción por parte del usuario.
 */
function handleOptionSelect(opt, button) {
    disableOptions();
    
    $nextActionButton.classList.add('hidden'); 

    if (opt.causes_short) {
        // Opción A: Cortocircuito
        showShortCircuit();
        showExplanation(opt.explanation, false, 'incorrect');
        markAttempt(currentLevelData.id, false);
        setupRetryButton(false);
    } else if (opt.correct) {
        // Opción B: Respuesta Correcta
        showCorrect(button);
        showExplanation(opt.explanation, true, 'correct');
        markAttempt(currentLevelData.id, true);
        markLevelCompleted(currentLevelData.id);
        $nextActionButton.textContent = 'Siguiente Nivel';
        $nextActionButton.classList.remove('hidden');
    } else {
        // Opción C: Respuesta Incorrecta (sin corto)
        showIncorrect(button);
        showExplanation(opt.explanation, false, 'incorrect');
        markAttempt(currentLevelData.id, false);
        setupRetryButton(true);
    }
}

/**
 * Deshabilita todos los botones de opción.
 */
function disableOptions() {
    Array.from($optionsContainer.children).forEach(btn => {
        btn.disabled = true;
    });
}

/**
 * Resalta el botón correcto.
 */
function showCorrect(button) {
    button.style.backgroundColor = varColor('success');
    button.style.borderColor = varColor('success');
}

/**
 * Resalta la opción incorrecta seleccionada.
 */
function showIncorrect(button) {
    button.style.backgroundColor = varColor('short-circuit');
    button.style.borderColor = varColor('short-circuit');
}

/**
 * Configura y muestra el botón de "Intentar de Nuevo".
 */
function setupRetryButton(isNormalFail) {
    $nextActionButton.textContent = isNormalFail ? 'Intentar de Nuevo' : 'Revisar Alerta y Reintentar';
    
    // Cambiamos el estilo del botón a rojo para indicar reintento
    $nextActionButton.style.backgroundColor = varColor('short-circuit');
    $nextActionButton.style.borderColor = varColor('short-circuit');
    $nextActionButton.style.color = '#fff';
    
    $nextActionButton.classList.remove('hidden');
}


/**
 * Muestra el área de retroalimentación con la explicación.
 */
function showExplanation(text, isCorrect, className) {
    $feedbackArea.classList.remove('hidden', 'correct', 'incorrect');
    $feedbackArea.classList.add(className);
    
    let prefix = isCorrect ? '¡Correcto! ' : 'Incorrecto. ';
    $feedbackText.textContent = prefix + text;
}


// ==========================================================
// 6. MANEJO DE LA ALERTA DE CORTOCIRCUITO
// ==========================================================

/**
 * Activa la alerta de cortocircuito.
 */
function showShortCircuit() {
    $shortAlert.classList.remove('hidden');
    $shortAlert.setAttribute('aria-hidden', 'false');
}

/**
 * Desactiva la alerta de cortocircuito.
 */
function hideShortCircuit() {
    $shortAlert.classList.add('hidden');
    $shortAlert.setAttribute('aria-hidden', 'true');
}

// ==========================================================
// 7. MANEJO DE PROGRESO (localStorage)
// ==========================================================

/**
 * Obtiene la lista de IDs de niveles completados desde localStorage.
 */
function getCompletedLevels() {
    const completed = localStorage.getItem(COMPLETED_LEVELS_KEY);
    return completed ? JSON.parse(completed) : [];
}

/**
 * Marca un nivel como completado en localStorage.
 */
function markLevelCompleted(levelId) {
    const completed = getCompletedLevels();
    if (!completed.includes(levelId)) {
        completed.push(levelId);
        localStorage.setItem(COMPLETED_LEVELS_KEY, JSON.stringify(completed));
    }
}

/**
 * Registra un intento (futuro).
 */
function markAttempt(levelId, success) {
    // Implementación futura
}


// ==========================================================
// 8. EVENT LISTENERS E INICIALIZACIÓN
// ==========================================================

/**
 * Función auxiliar para obtener variables CSS (para consistencia de color).
 */
function varColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
}

// Event Listeners principales
$backToLevelsButton.addEventListener('click', () => {
    renderLevelCards(); 
    showLevelSelection();
});

$closeShortButton.addEventListener('click', hideShortCircuit);

// Lógica de Siguiente Nivel/Reintento (FINAL y UNIFICADA)
$nextActionButton.addEventListener('click', () => {
    
    // 1. Caso de Éxito: Siguiente Nivel
    if ($nextActionButton.textContent.startsWith('Siguiente')) {
        
        let nextLevel = null;
        const levelId = currentLevelData.id;
        
        // Buscar el nivel actual y el siguiente dentro de su categoría
        for (const categoryKey in allLevels) {
            const levelsArray = allLevels[categoryKey].levels;
            const currentIndex = levelsArray.findIndex(l => l.id === levelId);
            
            if (currentIndex !== -1) {
                // Si encontramos el nivel, revisamos si hay uno siguiente
                if (levelsArray[currentIndex + 1]) {
                    nextLevel = levelsArray[currentIndex + 1];
                    break; // Siguiente nivel encontrado
                } else {
                    // Es el último nivel de esta categoría, salir del loop
                    break; 
                }
            }
        }
        
        // Restaurar estilo del botón
        $nextActionButton.style.backgroundColor = varColor('primary');
        $nextActionButton.style.borderColor = varColor('primary');
        $nextActionButton.style.color = '#121212';
        
        if (nextLevel) {
            loadLevel(nextLevel.file); // Carga el siguiente nivel
        } else {
            // Último nivel de la categoría completado
            alert('¡Felicidades! Has completado esta serie de niveles.');
            renderLevelCards();
            showLevelSelection();
        }

    } else {
        // 2. Caso de Falla: Intentar de Nuevo (incluye cortos y fallas normales)
        
        // Restaurar estilo del botón (de rojo a primario)
        $nextActionButton.style.backgroundColor = varColor('primary');
        $nextActionButton.style.borderColor = varColor('primary');
        $nextActionButton.style.color = '#121212';
        
        // Recargar el nivel actual
        let currentLevelFile = null;
        for (const categoryKey in allLevels) {
             const found = allLevels[categoryKey].levels.find(l => l.id === currentLevelData.id);
             if (found) {
                 currentLevelFile = found.file;
                 break;
             }
        }

        if (currentLevelFile) {
            loadLevel(currentLevelFile);
        } else {
            // Falla de emergencia
            renderLevelCards();
            showLevelSelection();
        }
    }
});


// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
    // La aplicación arranca cargando el índice de niveles de forma dinámica
    loadLevelIndex(); 
});
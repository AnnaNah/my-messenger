const socket = io();

// --------------------------------------------------
// SONS
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playPopSound() {
    const now = audioCtx.currentTime;

    // --- POU ---
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(400, now); // Note medium
    osc1.frequency.exponentialRampToValueAtTime(100, now + 0.05); // Chute vite
    
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    // --- PING ---
    const delay = 0.15; // Pause
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle'; 
    osc2.frequency.setValueAtTime(800, now + delay);
    osc2.frequency.exponentialRampToValueAtTime(1000, now + delay + 0.1);
    
    gain2.gain.setValueAtTime(0, now + delay);
    gain2.gain.linearRampToValueAtTime(0.1, now + delay + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.2);
    
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.05);
    
    osc2.start(now + delay);
    osc2.stop(now + delay + 0.2);
}

// --------------------------------------------------
// CONFIG UTILISATEUR (A rendre dynamique plus tard)
const userConfig = {
    name: "Anna_" + Math.floor(Math.random() * 100),
    color: Math.floor(Math.random()*16777215).toString(16)
};

// --------------------------------------------------
const container = document.querySelector('.container');
const header = container.querySelector('.header');
const content = container.querySelector('.content');
const footer = container.querySelector('.footer');
const scrollContainer = container.querySelector('.content > *');

function contentResize() {
    const containerHeight = container.offsetHeight;
    const headerHeight = header.offsetHeight;
    const footerHeight = footer.offsetHeight;
    const newContentSize = containerHeight - (headerHeight + footerHeight);
    content.style.height = `${newContentSize}px`;
}

const resizeObserver = new ResizeObserver(() => { contentResize(); });
function scrollToBottom() { scrollContainer.scrollTop = scrollContainer.scrollHeight; }

resizeObserver.observe(container);
resizeObserver.observe(header);
resizeObserver.observe(footer);
contentResize();
scrollToBottom();

// --------------------------------------------------
const messageInput = document.querySelector('.text-message > input');
const countDisplay = document.querySelector('.text-message > .char-counter');
const messageMaxLength = messageInput.getAttribute('maxlength');

messageInput.addEventListener('input', (e) => {
    const count = (messageMaxLength - e.target.value.length);
    countDisplay.textContent = `${count}`;
    if (count < 10) countDisplay.style.color = '#f00';
    else if (count < 80) countDisplay.style.color = '#fb0';
    else countDisplay.style.color = '#0008';
});

// --------------------------------------------------
const messageDisplay = content.querySelector('.message-container');

function getMessageStructure(name='', message='', isOwner=false, color='000') {
    const structureNode = document.createElement('div');
    structureNode.classList.add('message');
    structureNode.setAttribute('data-owner', isOwner);
    structureNode.innerHTML = `<div class="name" style="color:#${color};"><p>${name}</p></div><div class="text">${message}</div>`;
    return structureNode;
}

function printMessage(name, message, isOwner, color) {
    if (!message || message == '') return;
    messageDisplay.appendChild(getMessageStructure(name, message, isOwner, color));
    scrollToBottom();
}

// --------------------------------------------------
// GESTION DES POINTS SAUTILLANTS
const typingIndicator = document.querySelector('.typing');
let typingTimer;

messageInput.addEventListener('keydown', () => {
    socket.emit('typing', { isTyping: true });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        socket.emit('typing', { isTyping: false });
    }, 2000);
});

socket.on('user_typing', (data) => {
    if (data.isTyping) typingIndicator.classList.remove('not');
    else typingIndicator.classList.add('not');
});

// --------------------------------------------------
// ENVOI DE MESSAGE
const messageForm = footer.querySelector('form');

function getMessageParameters() {
    return {
        id: messageForm.querySelector('input[name="id"]').value,
        message: messageForm.querySelector('input[name="message"]').value,
    }
}

messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const params = getMessageParameters();

    if (params.message.trim() !== '') {
        socket.emit('chat_message', {
            name: userConfig.name, 
            message: params.message,
            color: userConfig.color
        });

        // STOP IMMEDIAT DES POINTS QUAND ON ENVOIE
        socket.emit('typing', { isTyping: false });
        clearTimeout(typingTimer);

        messageInput.value = '';
        countDisplay.textContent = messageMaxLength;
    }
});

// --------------------------------------------------
// CONTEUR DE CONNECTIONS
const connectCounter = document.querySelector('.connect-counter');

socket.on('user_count', (count) => {
    if (connectCounter) {
        connectCounter.textContent = count;
    }
});

socket.on('chat_message', (data) => {
    const isOwner = data.id === socket.id;
    
    if (!isOwner) {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        playPopSound();
    }

    printMessage(data.name, data.message, isOwner, data.color);
});
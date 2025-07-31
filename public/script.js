//form = chat form
//input = user input box
//chatBox = container to show messages
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const deleteBtn = document.getElementById('delete-chat'); // 🔸 New: delete button reference
    const newChatBtn = document.getElementById('new-chat-btn'); //new chat button
    const chatList = document.getElementById('chat-list'); // 🔸 New: sidebar container

    if (!form || !input || !chatBox) {
        console.error("Missing form, input, or chatBox in HTML.");
        return;
    }

    let chats = [[]]; // 🆕 Stores all chats as arrays
    let currentChatIndex = 0;

    function renderChat(index) {
        chatBox.innerHTML = '';
        chats[index].forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.classList.add('message', msg.role);
            msgDiv.innerText = msg.content;
            chatBox.appendChild(msgDiv);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function addSidebarButton(index) {
        const btn = document.createElement('button');
        btn.innerText = `Chat ${index + 1}`;
        btn.classList.add('sidebar-chat-btn');
        btn.addEventListener('click', () => {
            currentChatIndex = index;
            renderChat(currentChatIndex);
        });
        chatList.appendChild(btn);
    }

    // Add first sidebar button
    addSidebarButton(0);

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page reload

        const userInput = input.value.trim();
        if (!userInput) return;

        // Show user message
        const userMessage = document.createElement('div');
        userMessage.classList.add('message', 'user');
        userMessage.innerText = userInput;
        chatBox.appendChild(userMessage);
        chatBox.style.display = 'block';

        // Store user message
        chats[currentChatIndex].push({ role: 'user', content: userInput });

        try {
            const response = await fetch('/api/chat', { //sends user message to backend using fetch
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userInput })// this is called server.js
            });

            const data = await response.json(); //gets ai response from the server
            console.log("AI Response:", data.response);

            const botMessage = document.createElement('div');
            botMessage.classList.add('message', 'bot');
            botMessage.innerText = data.response; //shows ai reposne in chat
            chatBox.appendChild(botMessage);

            // Store AI response
            chats[currentChatIndex].push({ role: 'bot', content: data.response });

            chatBox.scrollTop = chatBox.scrollHeight; // scroll to then latest message
            input.value = ''; // clear input box
        } catch (err) {
            console.error("Fetch failed:", err);
        }
    });

    // 🗑️ Delete Chat button click handler (only new part)
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/clear', { method: 'POST' });
                const result = await res.json();

                if (result.success) {
                    chats[currentChatIndex] = [];
                    chatBox.innerHTML = ''; // Clear chat display
                    console.log("🧹 Chat cleared successfully.");
                }
            } catch (err) {
                console.error("Failed to clear chat:", err);
            }
        });
    }

    // ➕ New Chat button handler (adds new empty chat and sidebar button)
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            chats.push([]);
            currentChatIndex = chats.length - 1;
            addSidebarButton(currentChatIndex);
            renderChat(currentChatIndex);
        });
    }
});

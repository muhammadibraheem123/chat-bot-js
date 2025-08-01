//form = chat form
//input = user input box
//chatBox = container to show messages
// Wait until the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');         // form = chat form
    const input = document.getElementById('user-input');       // input = user input box
    const chatBox = document.getElementById('chat-box');       // chatBox = container to show messages
    const deleteBtn = document.getElementById('delete-chat');  // delete button
    const newChatBtn = document.getElementById('new-chat-btn');// new chat button
    const chatList = document.getElementById('chat-list');     // sidebar with chat buttons
    const imageInput = document.getElementById('image-input'); // New: image file input

    if (!form || !input || !chatBox) {
        console.error("Missing form, input, or chatBox in HTML.");
        return;
    }

    let chats = [[]]; // Stores all chats as arrays of messages
    let currentChatIndex = 0;

    // Show all messages in current chat
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

    // Add button to sidebar for a chat
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

    addSidebarButton(0); // Add button for the first chat

    // 📎 Handle image upload via ➕ icon
    if (imageInput) {
        imageInput.addEventListener('change', () => {
            const file = imageInput.files[0];
            if (file) {
                const fileMessage = document.createElement('div');
                fileMessage.classList.add('message', 'user');
                fileMessage.innerText = `📁 Uploaded: ${file.name}`;
                chatBox.appendChild(fileMessage);
                chatBox.scrollTop = chatBox.scrollHeight;

                // Store image file info (not uploading for now, just displaying name)
                chats[currentChatIndex].push({ role: 'user', content: `Uploaded file: ${file.name}` });
            }
        });
    }

    // 📨 On chat form submit
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

        chats[currentChatIndex].push({ role: 'user', content: userInput });

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userInput }) // Send user input to backend
            });

            const data = await response.json(); // Get AI response
            console.log("AI Response:", data.text); // ✅ FIXED

            const botMessage = document.createElement('div');
            botMessage.classList.add('message', 'bot');
            botMessage.innerText = data.text; // ✅ FIXED
            chatBox.appendChild(botMessage);

            chats[currentChatIndex].push({ role: 'bot', content: data.text }); // ✅ FIXED

            chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
            input.value = ''; // Clear input
        } catch (err) {
            console.error("Fetch failed:", err);
        }
    });

    // 🗑️ Handle delete chat button
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/clear', { method: 'POST' });
                const result = await res.json();

                if (result.success) {
                    chats[currentChatIndex] = [];
                    chatBox.innerHTML = '';
                    console.log("🧹 Chat cleared successfully.");
                }
            } catch (err) {
                console.error("Failed to clear chat:", err);
            }
        });
    }

    // ➕ New Chat button click
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            chats.push([]);
            currentChatIndex = chats.length - 1;
            addSidebarButton(currentChatIndex);
            renderChat(currentChatIndex);
        });
    }
});

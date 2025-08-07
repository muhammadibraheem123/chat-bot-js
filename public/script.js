document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const deleteBtn = document.getElementById('delete-chat');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatList = document.getElementById('chat-list');
    const imageInput = document.getElementById('image-input');

    const previewContainer = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');

    if (!form || !input || !chatBox) {
        console.error("Missing form, input, or chatBox in HTML.");
        return;
    }

    let chats = [[]];
    let currentChatIndex = 0;
    let pendingImage = null;

    function formatMessage(message) {
        // Escape HTML to prevent XSS
        message = message
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Bold: **text**
        message = message.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Italics: _text_
        message = message.replace(/_(.*?)_/g, "<em>$1</em>");

        // Line breaks: \n → <br>
        message = message.replace(/\n/g, "<br>");

        return message;
    }

    function renderChat(index) {
        chatBox.innerHTML = '';

        if (chats[index].length === 0) {
            const placeholder = document.createElement('div');
            placeholder.classList.add('placeholder-message');
            placeholder.innerText = "What's on your mind today?";
            chatBox.appendChild(placeholder);
        } else {
            chats[index].forEach(msg => {
                const msgDiv = document.createElement('div');
                msgDiv.classList.add('message', msg.role);

                if (msg.type === 'image') {
                    const img = document.createElement('img');
                    img.src = msg.content;
                    img.style.maxWidth = '200px';
                    img.style.borderRadius = '12px';
                    msgDiv.appendChild(img);
                } else {
                    if (msg.role === 'bot') {
                        msgDiv.innerHTML = formatMessage(msg.content);
                    } else {
                        msgDiv.innerText = msg.content;
                    }
                }

                chatBox.appendChild(msgDiv);
            });
        }

        chatBox.scrollTop = chatBox.scrollHeight;
        updateSidebarTitles();
    }

    function updateSidebarTitles() {
        const buttons = chatList.querySelectorAll('.sidebar-chat-btn');
        buttons.forEach((btn, i) => {
            const firstUserMsg = chats[i].find(msg => msg.role === 'user' && msg.content);
            const title = firstUserMsg ? firstUserMsg.content : 'New Chat';
            btn.querySelector('.chat-title').innerText = title.length > 40 ? title.slice(0, 40) + '…' : title;
        });
    }

    function addSidebarButton(index) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('sidebar-chat-entry');

        const btn = document.createElement('div');
        btn.classList.add('sidebar-chat-entry');

        const spanTitle = document.createElement('span');
        spanTitle.classList.add('chat-title');
        const firstUserMessage = chats[index].find(msg => msg.role === 'user' && msg.content);
        const title = firstUserMessage ? firstUserMessage.content : `New Chat`;
        spanTitle.innerText = title.length > 40 ? title.slice(0, 40) + '…' : title;

        btn.appendChild(spanTitle);
        btn.addEventListener('click', () => {
            currentChatIndex = index;
            renderChat(currentChatIndex);
        });

        const optionsContainer = document.createElement('div');
        optionsContainer.classList.add('chat-options');

        const dots = document.createElement('span');
        dots.classList.add('chat-dots');
        dots.innerText = '⋮';

        const menu = document.createElement('div');
        menu.classList.add('chat-menu');
        const deleteOption = document.createElement('button');
        deleteOption.innerText = 'Delete Chat';
        deleteOption.classList.add('delete-chat-btn');

        deleteOption.addEventListener('click', (e) => {
            e.stopPropagation();
            chats.splice(index, 1);
            if (currentChatIndex === index) currentChatIndex = 0;
            chatList.innerHTML = '';
            chats.forEach((_, i) => addSidebarButton(i));
            renderChat(currentChatIndex);
        });

        dots.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = menu.style.display === 'block';
            document.querySelectorAll('.chat-menu').forEach(m => m.style.display = 'none');
            menu.style.display = isVisible ? 'none' : 'block';
        });

        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });

        menu.appendChild(deleteOption);
        optionsContainer.appendChild(dots);
        optionsContainer.appendChild(menu);

        wrapper.appendChild(btn);
        wrapper.appendChild(optionsContainer);
        chatList.appendChild(wrapper);
    }

    addSidebarButton(0);
    renderChat(currentChatIndex);

    if (imageInput) {
        imageInput.addEventListener('change', () => {
            const file = imageInput.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    previewImg.src = reader.result;
                    previewContainer.style.display = 'block';
                    pendingImage = reader.result;

                    // Add inline styles for ChatGPT-style inline preview
                    previewImg.style.maxHeight = '38px';
                    previewImg.style.objectFit = 'cover';
                    previewImg.style.borderRadius = '6px';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userInput = input.value.trim();
        if (!userInput && !pendingImage) return;

        if (userInput) {
            chats[currentChatIndex].push({ role: 'user', content: userInput });
        }

        if (pendingImage) {
            chats[currentChatIndex].push({ role: 'user', content: pendingImage, type: 'image' });

            try {
                const description = await analyzeImage(pendingImage);
                chats[currentChatIndex].push({ role: 'bot', content: description });
            } catch (err) {
                chats[currentChatIndex].push({ role: 'bot', content: '⚠️ Failed to analyze image.' });
            }

            previewImg.src = '';
            previewContainer.style.display = 'none';
            imageInput.value = '';
            pendingImage = null;
        }

        input.value = '';
        renderChat(currentChatIndex);

        if (userInput) {
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: userInput })
                });

                const data = await response.json();
                console.log("AI Response:", data);

                const botReply = data.response || "⚠️looks like you ran out of limit.Try again later or maybe buy our premium subscription for only $9999";
                chats[currentChatIndex].push({ role: 'bot', content: botReply });
                renderChat(currentChatIndex);

            } catch (err) {
                console.error("Fetch failed:", err);
                chats[currentChatIndex].push({ role: 'bot', content: '⚠️ Error talking to server.' });
                renderChat(currentChatIndex);
            }
        } else {
            renderChat(currentChatIndex);
        }
    });

    if (deleteBtn) {
        deleteBtn?.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/clear', { method: 'POST' });
                const result = await res.json();
                if (result.success) {
                    chats[currentChatIndex] = [];
                    renderChat(currentChatIndex);
                    console.log("🧹 Chat cleared successfully.");
                }
            } catch (err) {
                console.error("Failed to clear chat:", err);
            }
        });
    }

    if (newChatBtn) {
        newChatBtn?.addEventListener('click', () => {
            chats.push([]);
            currentChatIndex = chats.length - 1;
            addSidebarButton(currentChatIndex);
            renderChat(currentChatIndex);
        });
    }

    async function analyzeImage(base64Image) {
        try {
            const [prefix, base64Data] = base64Image.split(',');
            const mimeType = prefix.match(/data:(.*);base64/)[1];

            const res = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64Data, mimeType })
            });
            const data = await res.json();
            return data.description || '⚠️ Gemini Vision returned no description.';
        } catch (err) {
            console.error('Vision fetch failed:', err);
            return '⚠️ Error analyzing image.';
        }
    }
});

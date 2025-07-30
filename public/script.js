document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');

    if (!form || !input || !chatBox) {
        console.error("Missing form, input, or chatBox in HTML.");
        return;
    }

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

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userInput })
            });

            const data = await response.json();
            console.log("AI Response:", data.response);

            const botMessage = document.createElement('div');
            botMessage.classList.add('message', 'bot');
            botMessage.innerText = data.response;
            chatBox.appendChild(botMessage);

            chatBox.scrollTop = chatBox.scrollHeight;
            input.value = '';
        } catch (err) {
            console.error("Fetch failed:", err);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('visitorModal');
    const form = document.getElementById('visitorForm');

    // Check if user has already identified themselves
    if (!localStorage.getItem('visitor_identified')) {
        modal.style.display = 'flex';
    }

    const closeBtn = document.getElementById('closeModal');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

        // Close modal if clicking outside the box
        window.addEventListener('click', (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            firstName: document.getElementById('firstName').value,
            company: document.getElementById('company').value,
            role: document.getElementById('role').value,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Connecting...';

        try {
            // Replace with  actual n8n Webhook URL
            await fetch('https://n8n.yourdomain.com/webhook/visitor-hit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            localStorage.setItem('visitor_identified', 'true');
            modal.style.display = 'none';
        } catch (error) {
            console.error('Webhook failed', error);
            modal.style.display = 'none';
        }
    });
});
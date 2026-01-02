document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('visitorForm');

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
            // Send to backend API which saves to PostgreSQL
            const response = await fetch('/api/visitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            submitBtn.innerText = 'Submitted!';
            submitBtn.style.background = '#10b981';
            
            // Clear form after successful submission
            form.reset();
            
            // Re-enable button after a delay
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Submit';
                submitBtn.style.background = '';
            }, 2000);
        } catch (error) {
            console.error('Webhook failed', error);
            submitBtn.innerText = 'Error - Try Again';
            submitBtn.style.background = '#ef4444';
            
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Submit';
                submitBtn.style.background = '';
            }, 2000);
        }
    });
});
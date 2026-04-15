document.addEventListener('DOMContentLoaded', () => {
    const printsGrid = document.getElementById('prints-grid');
    const seriesDropdown = document.getElementById('series-dropdown');
    const quoteForm = document.getElementById('quote-form');
    const messageArea = document.getElementById('message');
    const formStatus = document.getElementById('form-status');

    let allPhotos = [];
    let photoData = null;

    // 1. Fetch Photo Data
    fetch('photos.json')
        .then(res => res.json())
        .then(data => {
            photoData = data;
            // Flatten all photos for easy filtering
            const landscape = Object.values(data.landscape || {});
            const portrait = Object.values(data.portrait || {});
            allPhotos = [...landscape, ...portrait];

            initSeriesFilter();
            renderPrints('all');
        })
        .catch(err => {
            console.error("Error loading photos:", err);
            printsGrid.innerHTML = '<div class="error">Failed to load collection.</div>';
        });

    // 2. Initialize Filter Dropdown
    function initSeriesFilter() {
        const seriesSet = new Set();
        allPhotos.forEach(p => {
            if (p.series) seriesSet.add(p.series);
        });

        const sortedSeries = Array.from(seriesSet).sort();
        sortedSeries.forEach(seriesName => {
            const option = document.createElement('option');
            option.value = seriesName;
            option.textContent = seriesName;
            seriesDropdown.appendChild(option);
        });

        seriesDropdown.addEventListener('change', (e) => {
            renderPrints(e.target.value);
        });
    }

    // 3. Render Photo Cards
    function renderPrints(filter) {
        printsGrid.innerHTML = '';
        const filtered = filter === 'all' 
            ? allPhotos 
            : allPhotos.filter(p => p.series === filter);

        if (filtered.length === 0) {
            printsGrid.innerHTML = '<div class="empty-msg">No photos found in this series.</div>';
            return;
        }

        filtered.forEach(photo => {
            const card = document.createElement('div');
            card.className = 'print-card anim-fade-in';
            card.innerHTML = `
                <div class="print-img-container">
                    <img src="watermarked_photos/${photo.filename}" alt="${photo.filename}" loading="lazy">
                </div>
                <div class="print-info">
                    <div class="print-text">
                        <h3>${photo.filename.replace('.jpg', '')}</h3>
                        <p class="print-series">${photo.series}</p>
                    </div>
                    <button class="request-btn" data-title="${photo.filename.replace('.jpg', '')}" data-series="${photo.series}">
                        REQUEST QUOTE
                    </button>
                </div>
            `;
            printsGrid.appendChild(card);
        });

        // Add listeners to new buttons
        const requestBtns = document.querySelectorAll('.request-btn');
        requestBtns.forEach(btn => {
            btn.addEventListener('click', handleRequestQuote);
        });
    }

    // 4. Handle Request Quote Automation (Multiple Selections)
    function handleRequestQuote(e) {
        const title = e.target.getAttribute('data-title');
        const series = e.target.getAttribute('data-series');
        
        const newInquiry = `Interested in "${title}" from the "${series}" collection.`;

        if (messageArea.value.trim() === "" || messageArea.value.includes("Share your vision...")) {
            // First selection
            messageArea.value = `Hi! I am interested in a quote for the following work:\n\n- ${newInquiry}\n\nPlease let me know about available sizes and pricing.`;
        } else {
            // Append to existing message
            const lines = messageArea.value.split('\n');
            // Try to insert before the last "Please let me know..." line if it exists
            const closingIndex = lines.findIndex(l => l.includes("Please let me know"));
            
            if (closingIndex !== -1) {
                lines.splice(closingIndex, 0, `- ${newInquiry}`);
                messageArea.value = lines.join('\n');
            } else {
                messageArea.value += `\n- ${newInquiry}`;
            }
        }
        
        // Visual feedback on the textarea
        messageArea.classList.add('highlight-flash');
        setTimeout(() => messageArea.classList.remove('highlight-flash'), 1000);

        // Scroll to form (but don't force focus every time if they are picking many)
        const formTop = document.querySelector('.contact-left').offsetTop;
        window.scrollTo({
            top: formTop - 100,
            behavior: 'smooth'
        });
        
        // Update button state briefly
        e.target.textContent = 'ADDED TO QUOTE';
        e.target.style.backgroundColor = '#4CAF50';
        e.target.style.color = 'white';
        setTimeout(() => {
            e.target.textContent = 'REQUEST QUOTE';
            e.target.style.backgroundColor = '';
            e.target.style.color = '';
        }, 2000);
    }

    // 5. AJAX Form Submission to Formspree
    quoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-btn');
        const originalText = btn.textContent;
        
        btn.textContent = 'SENDING...';
        btn.disabled = true;

        const formData = new FormData(quoteForm);
        
        try {
            const response = await fetch(quoteForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                btn.textContent = 'MESSAGE SENT';
                btn.style.backgroundColor = '#4CAF50';
                btn.style.color = 'white';
                
                formStatus.textContent = 'Thank you! Your quote request has been sent successfully.';
                formStatus.classList.add('visible');

                quoteForm.reset();

                // Revert button after a few seconds
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                    formStatus.classList.remove('visible');
                }, 5000);
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Submission failed');
            }
        } catch (err) {
            console.error("Formspree Error:", err);
            btn.textContent = 'ERROR';
            btn.style.backgroundColor = '#f44336';
            btn.style.color = 'white';
            
            formStatus.textContent = 'Oops! There was a problem sending your message. Please try again.';
            formStatus.classList.add('visible');
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
                btn.style.backgroundColor = '';
                btn.style.color = '';
            }, 3000);
        }
    });
});

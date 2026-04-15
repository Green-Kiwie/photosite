document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.querySelector('.gallery-page-container');
    const scrollSentinel = document.getElementById('scroll-sentinel');
    const targetRowHeight = window.innerWidth > 768 ? 350 : 200;
    
    let allSeries = [];
    let currentlyLoadedSeriesIndex = 0;
    let is_loading = false;

    let allPhotoData = null;

    function getOrientation() {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    // Fetch and Initialize
    fetch('photos.json')
        .then(response => response.json())
        .then(data => {
            allPhotoData = data;
            initializeGalleryData();
            setupInfiniteScroll();
        })
        .catch(error => {
            console.error('Error loading gallery photos:', error);
        });

    function initializeGalleryData() {
        if (allSeries.length > 0) return;
        
        // Combine landcape and portrait photos for a universal gallery
        const landscapePhotos = Object.values(allPhotoData.landscape || {});
        const portraitPhotos = Object.values(allPhotoData.portrait || {});
        const photos = [...landscapePhotos, ...portraitPhotos];

        // Group and Sort
        const groups = photos.reduce((acc, photo) => {
            const s = photo.series || "Uncategorized";
            if (!acc[s]) acc[s] = [];
            acc[s].push(photo);
            return acc;
        }, {});

        const sortedSeriesNames = Object.keys(groups).sort();
        allSeries = sortedSeriesNames.map(name => ({
            name: name,
            photos: groups[name]
        }));

        // Reset display
        currentlyLoadedSeriesIndex = 0;
        is_loading = false;
        
        // Remove existing series (sections)
        const existingSections = document.querySelectorAll('.series-section');
        existingSections.forEach(s => s.remove());
        
        scrollSentinel.style.display = 'block';
    }

    function setupInfiniteScroll() {
        // Load the first series immediately
        loadNextSeries();

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !is_loading) {
                loadNextSeries();
            }
        }, {
            rootMargin: '400px' // Load when sentinel is within 400px of viewport bottom
        });

        observer.observe(scrollSentinel);
    }

    function loadNextSeries() {
        if (currentlyLoadedSeriesIndex >= allSeries.length || is_loading) {
            if (currentlyLoadedSeriesIndex >= allSeries.length) {
                scrollSentinel.style.display = 'none';
            }
            return;
        }

        is_loading = true;
        const series = allSeries[currentlyLoadedSeriesIndex];
        renderSeries(series);
        currentlyLoadedSeriesIndex++;

        // Give the DOM a moment to update/images to start loading, 
        // then check if we need to load another because sentinel is still in view
        setTimeout(() => {
            is_loading = false;
            checkSentinelVisibility();
        }, 300);
    }

    function checkSentinelVisibility() {
        const rect = scrollSentinel.getBoundingClientRect();
        if (rect.top < window.innerHeight + 400 && currentlyLoadedSeriesIndex < allSeries.length) {
            loadNextSeries();
        }
    }

    function renderSeries(series) {
        const section = document.createElement('section');
        section.className = 'series-section';
        
        const header = document.createElement('header');
        header.className = 'series-header';
        const h2 = document.createElement('h2');
        h2.className = 'series-name';
        h2.textContent = series.name;
        header.appendChild(h2);
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'justified-grid';
        section.appendChild(grid);

        mainContainer.insertBefore(section, scrollSentinel);

        series.photos.forEach((photo, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'grid-item';
            itemDiv.style.flexBasis = targetRowHeight + 'px';
            itemDiv.style.opacity = '0';
            
            const img = document.createElement('img');
            img.src = `watermarked_photos/${photo.filename}`;
            img.alt = photo.title || photo.filename;
            
            const overlay = document.createElement('div');
            overlay.className = 'item-overlay';
            const locTag = document.createElement('span');
            locTag.className = 'overlay-location';
            locTag.textContent = photo.location || 'Unknown Location';
            overlay.appendChild(locTag);

            img.onload = function() {
                const aspectRatio = this.naturalWidth / this.naturalHeight;
                // flex-grow is removed to prevent cropping on single-image rows/series
                itemDiv.style.flexBasis = (targetRowHeight * aspectRatio) + "px";
                itemDiv.style.opacity = '1';
                itemDiv.style.transition = 'opacity 0.8s ease-out';
            };

            itemDiv.appendChild(img);
            itemDiv.appendChild(overlay);
            grid.appendChild(itemDiv);
        });
    }

    // Debounced Resize Support
    let resizeTimer;
    window.addEventListener('resize', () => {

        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const newHeight = window.innerWidth > 768 ? 350 : 200;
            document.querySelectorAll('.grid-item img').forEach(img => {
                if (img.naturalWidth) {
                    const ratio = img.naturalWidth / img.naturalHeight;
                    const item = img.parentElement;
                    item.style.flexBasis = (newHeight * ratio) + "px";
                }
            });
        }, 250);
    });
});

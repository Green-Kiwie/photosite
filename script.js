document.addEventListener('DOMContentLoaded', async () => {
    // Nav bar appearance logic
    const navbar = document.getElementById('navbar');
    const photoInfo = document.getElementById('photo-info');
    let mouseTimeout;

    document.addEventListener('mousemove', () => {
        navbar.classList.remove('hidden');
        photoInfo.classList.remove('nav-hidden');
        clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(() => {
            navbar.classList.add('hidden');
            photoInfo.classList.add('nav-hidden');
        }, 3000);
    });

    // Initial hide of navbar
    setTimeout(() => {
        navbar.classList.add('hidden');
        photoInfo.classList.add('nav-hidden');
    }, 2000);

    // Clock logic
    const clockEl = document.getElementById('clock');
    
    function updateClock() {
        const now = new Date();
        const hrs = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        clockEl.textContent = `${hrs}:${mins}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Weather and Location Logic
    const locNameEl = document.getElementById('loc-name');
    const weatherTempEl = document.getElementById('weather-temp');
    const weatherDescEl = document.getElementById('weather-desc');

    async function fetchWeather() {
        try {
            // Ask for Geolocation directly to use actual location
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    // Try to get locality name using OpenStreetMap free geocoding
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`);
                    const geoData = await geoRes.json();
                    
                    const city = geoData.address.city || geoData.address.town || geoData.address.village || "Unknown City";
                    const country = geoData.address.country;
                    locNameEl.textContent = `${city}, ${country}`;
                } catch(e) {
                    locNameEl.textContent = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
                }

                getWeatherData(lat, lon);

            }, async (err) => {
                // Fallback to IP geolocation if permission denied or unavailable
                console.log("Geolocation permission denied, falling back to IP based location", err);
                const ipRes = await fetch('https://ipapi.co/json/');
                const ipData = await ipRes.json();
                if(ipData.city && ipData.country_name) {
                    locNameEl.textContent = `${ipData.city}, ${ipData.country_name}`;
                } else {
                    locNameEl.textContent = "Unknown location";
                }
                getWeatherData(ipData.latitude, ipData.longitude);
            });
            
        } catch (err) {
            console.error("Error setting up weather:", err);
            locNameEl.textContent = "Unknown location";
            weatherTempEl.textContent = "--°F";
            weatherDescEl.textContent = "Offline";
        }
    }

    async function getWeatherData(lat, lon) {
        try {
            // Get weather from open-meteo
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`);
            const weatherData = await weatherRes.json();
            
            const temp = Math.round(weatherData.current_weather.temperature);
            const code = weatherData.current_weather.weathercode;
            
            weatherTempEl.textContent = `${temp}°F`;
            
            // Map weather codes to description
            let desc = "Clear";
            if(code >= 1 && code <= 3) desc = "Partly Cloudy";
            if(code >= 45 && code <= 48) desc = "Foggy";
            if(code >= 51 && code <= 67) desc = "Rain";
            if(code >= 71 && code <= 77) desc = "Snow";
            if(code >= 80 && code <= 82) desc = "Showers";
            if(code >= 95) desc = "Thunderstorm";
            
            weatherDescEl.textContent = desc;
        } catch(e) {
            console.error("Error fetching weather data", e);
            weatherTempEl.textContent = "--°F";
            weatherDescEl.textContent = "Offline";
        }
    }

    fetchWeather();

    // Gallery Logic
    const bgContainer = document.getElementById('bg-container');
    
    let photoData = null;
    let photos = [];
    let currentIndex = 0;
    let rotationInterval;
    const ROTATION_TIME_MS = 3 * 60 * 1000; // 3 minutes rotation
    
    function getOrientation() {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    let currentOrientation = null;

    async function initGallery() {
        try {
            const res = await fetch('photos.json');
            photoData = await res.json();
            
            updateGalleryForOrientation();
            
            // Handle orientation changes
            window.addEventListener('resize', () => {
                const newOrientation = getOrientation();
                if (newOrientation !== currentOrientation) {
                    updateGalleryForOrientation();
                }
            });
            
        } catch(err) {
            console.error("Error loading photos:", err);
        }
    }

    function updateGalleryForOrientation() {
        const orientation = getOrientation();
        if (orientation === currentOrientation && photos.length > 0) return;
        
        currentOrientation = orientation;
        const rawPhotos = photoData[orientation] || {};
        const newPhotos = Object.values(rawPhotos);
        
        if (newPhotos.length === 0) return;

        photos = newPhotos;
        
        // Clear existing images
        bgContainer.innerHTML = '';
        
        // Randomize starting slide
        currentIndex = Math.floor(Math.random() * photos.length);
        
        photos.forEach((photo, index) => {
            const img = document.createElement('img');
            img.src = `watermarked_photos/${photo.filename}`;
            img.classList.add('bg-image');
            
            // Apply subject-aware anchor point for responsive cropping
            if (photo.anchor) {
                img.style.objectPosition = `${photo.anchor.x}% ${photo.anchor.y}%`;
            }
            
            if(index === currentIndex) {
                img.classList.add('active');
            }
            
            bgContainer.appendChild(img);
        });

        updateUI(true);
        startRotation();
    }

    function showNextPhoto() {
        if(photos.length <= 1) return;
        
        const images = document.querySelectorAll('.bg-image');
        images[currentIndex].classList.remove('active');
        
        currentIndex = (currentIndex + 1) % photos.length;
        images[currentIndex].classList.add('active');
        
        updateUI();
    }

    function showPrevPhoto() {
        if(photos.length <= 1) return;
        
        const images = document.querySelectorAll('.bg-image');
        images[currentIndex].classList.remove('active');
        
        currentIndex = (currentIndex - 1 + photos.length) % photos.length;
        images[currentIndex].classList.add('active');
        
        updateUI(false);
    }

    function updateUI(isInitial = false) {
        // Update photo info static string top left
        const titleEl = document.getElementById('photo-info');
        titleEl.innerHTML = `KIWI SHOOTS &copy; 2024 &nbsp;—&nbsp; ${photos[currentIndex].location.toUpperCase()}`;
        
        // Move Widget to designated JSON corner
        const photo = photos[currentIndex];
        
        const images = document.querySelectorAll('.bg-image');
        if(images[currentIndex]) {
             updateDynamicTextColor(images[currentIndex], titleEl, photo);
        }
        
        const widget = document.getElementById('widget');
        
        if (!isInitial) {
            // Drop a visual clone of the widget to mask the retiring image's watermark flawlessly.
            const ghost = widget.cloneNode(true);
            ghost.removeAttribute('id');
            ghost.className = widget.className + ' ghost-widget';
            
            // Snapshot current CSS bindings to decouple it from position drift
            const oldScale = document.documentElement.style.getPropertyValue('--widget-scale');
            const oldX = document.documentElement.style.getPropertyValue('--widget-margin-x');
            const oldY = document.documentElement.style.getPropertyValue('--widget-margin-y');            
            ghost.style.setProperty('--widget-scale', oldScale);
            ghost.style.setProperty('--widget-margin-x', oldX);
            ghost.style.setProperty('--widget-margin-y', oldY);
            
            widget.parentNode.appendChild(ghost);
            
            void ghost.offsetWidth; // Reflow commit
            ghost.style.opacity = '0'; // Fire 2s fade out sync
            
            setTimeout(() => ghost.remove(), 2000); // Purge memory
            
            widget.classList.remove('anim-fade-in');
            void widget.offsetWidth;
            widget.classList.add('anim-fade-in');
        }
        
        alignWidgets();
    }

    function alignWidgets() {
        const img = document.querySelector('.bg-image.active');
        if (!img || !img.naturalWidth) return;
        
        const photo = photos[currentIndex];
        const pos = photo.widgetPosition || { corner: 'bottom-right', x: 180, y: 180 };
        
        // Match the browser's object-fit: cover exact scaling math
        const scale = Math.max(window.innerWidth / img.naturalWidth, window.innerHeight / img.naturalHeight);
        
        const renderW = img.naturalWidth * scale;
        const renderH = img.naturalHeight * scale;
        
        const offsetX = (window.innerWidth - renderW) / 2;
        const offsetY = (window.innerHeight - renderH) / 2;
        
        // Extract exact edge pixel distances dynamically anchoring the object crop scaling 
        const widgetMarginX = (pos.x * scale) + offsetX;
        const widgetMarginY = (pos.y * scale) + offsetY;
        
        document.documentElement.style.setProperty('--widget-margin-x', `${widgetMarginX}px`);
        document.documentElement.style.setProperty('--widget-margin-y', `${widgetMarginY}px`);
        
        // Sync the physical proportions of the widget window perfectly with the zoom of the text watermark
        const widgetScale = Math.min(1.8, Math.max(0.45, scale));
        document.documentElement.style.setProperty('--widget-scale', `${widgetScale}`);
        
        const widget = document.getElementById('widget');
        const isAnim = widget.classList.contains('anim-fade-in');
        widget.className = `corner-${pos.corner}`;
        if (isAnim) widget.classList.add('anim-fade-in');
        
        widget.style.transformOrigin = pos.corner.replace('-', ' ');
    }
    
    window.addEventListener('resize', alignWidgets);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            showNextPhoto();
            clearInterval(rotationInterval);
            startRotation();
        } else if (e.key === 'ArrowLeft') {
            showPrevPhoto();
            clearInterval(rotationInterval);
            startRotation();
        }
    });

    function startRotation() {
        rotationInterval = setInterval(showNextPhoto, ROTATION_TIME_MS);
    }
    
    function updateDynamicTextColor(img, textEl, photoObj) {
        if (photoObj.cachedTitleColor) {
            textEl.style.color = photoObj.cachedTitleColor;
            return;
        }

        if (!img.complete || img.naturalHeight === 0) {
            img.addEventListener('load', () => {
                updateDynamicTextColor(img, textEl, photoObj);
                alignWidgets(); // sync math when image completely fills parameters
            }, {once: true});
            return;
        }
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            const scale = 0.1;
            canvas.width = img.naturalWidth * scale;
            canvas.height = img.naturalHeight * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const cropW = Math.max(1, Math.floor(canvas.width * 0.4));
            const cropH = Math.max(1, Math.floor(canvas.height * 0.2));
            
            const imageData = ctx.getImageData(0, 0, cropW, cropH);
            const data = imageData.data;
            
            let r=0,g=0,b=0;
            let count = 0;
            for(let i = 0; i < data.length; i += 4) {
               r += data[i]; g += data[i+1]; b += data[i+2];
               count++;
            }
            
            if (count > 0) {
                r = r/count; g = g/count; b = b/count;
                const brightness = Math.round(0.299*r + 0.587*g + 0.114*b);
                
                const color = brightness > 127 
                    ? 'rgba(15, 20, 25, 0.75)'   // Dark slate + transparent
                    : 'rgba(240, 245, 250, 0.85)'; // Frost white + transparent
                
                photoObj.cachedTitleColor = color;
                textEl.style.color = color;
            }
        } catch(e) {
            console.error("Canvas read failed:", e);
            textEl.style.color = 'rgba(255, 255, 255, 0.8)';
        }
    }

    initGallery();
});

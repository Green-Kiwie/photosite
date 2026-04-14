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
    
    let photos = [];
    let currentIndex = 0;
    let rotationInterval;
    const ROTATION_TIME_MS = 3 * 60 * 1000; // 3 minutes rotation
    
    async function initGallery() {
        try {
            const res = await fetch('photos.json');
            photos = await res.json();
            
            if (photos.length === 0) return;
            
            // Randomize starting slide
            currentIndex = Math.floor(Math.random() * photos.length);
            
            photos.forEach((photo, index) => {
                const img = document.createElement('img');
                img.src = `watermarked_photos/${photo.filename}`;
                img.classList.add('bg-image');
                
                if(index === currentIndex) {
                    img.classList.add('active');
                }
                
                bgContainer.appendChild(img);
            });

            updateUI();
            startRotation();
            
        } catch(err) {
            console.error("Error loading photos:", err);
        }
    }

    function showNextPhoto() {
        if(photos.length <= 1) return;
        
        const images = document.querySelectorAll('.bg-image');
        images[currentIndex].classList.remove('active');
        
        currentIndex = (currentIndex + 1) % photos.length;
        images[currentIndex].classList.add('active');
        
        updateUI();
    }

    function updateUI() {
        // Update photo info static string top left
        const titleEl = document.getElementById('photo-info');
        titleEl.innerHTML = `SHOOTS.KIWI &copy; 2020 &nbsp;—&nbsp; ${photos[currentIndex].location.toUpperCase()}`;
        
        // Move Widget to designated JSON corner
        const photo = photos[currentIndex];
        const widgetConfig = photo.widgetPosition || { corner: 'bottom-left' };
        document.getElementById('widget').className = `corner-${widgetConfig.corner}`;
    }

    function startRotation() {
        rotationInterval = setInterval(showNextPhoto, ROTATION_TIME_MS);
    }

    initGallery();
});

'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const form2 = document.querySelector('.form2');
const btnClear = document.querySelector('.btn__clear');
const btnRemove = document.querySelector('.btn__remove');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // km
    this.duration = duration; // min
  }

  _setDescription() {
    // prettier-ignore
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////////////////////
// architektura aplikacji
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    //pozycja
    this._getPosition();

    //pobieranie z locala
    this._getLocalStorage();
    //handlery
    form.addEventListener('submit', this._newWorkout.bind(this));
    // form2.addEventListener('submit', this.newWork.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    btnClear.addEventListener('click', this.clearWorkouts.bind(this));
    // btnClear.style.opacity = 0;
    document.addEventListener('click', this.removeWorkout.bind(this));
    if (this.#workouts.length > 0) {
      btnClear.style.opacity = 1;
    } else {
      btnClear.style.opacity = 0;
    }
    // document.addEventListener('click', this._editWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }
  _renderMarker() {
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //klikanie na mape
    this.#map.on('click', this._showForm.bind(this));
    this._renderMarker();
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;

    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    //wyczysc input
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();
    // dane z forma

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // jesli biega to instancja running
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // sprawdz czy data ok
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //jesli jezdzi do instancja cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    console.log(workout);
    //dodaj obiekt do arraya wokrout
    this.#workouts.push(workout);
    //wyrenderuj workout jako marker
    this._renderWorkoutMarker(workout);
    //wyrenderuj workout na liscie
    this._renderWorkout(workout);
    //wyczysc input
    this._hideForm();
    //stworz local storage
    this._setLocalStorage();
    //pokaz przycisk usuwania
    btnClear.style.opacity = 1;
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup ${workout.id}`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout, sort = false) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <button class="btn__remove">Remove</button>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      `;

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
        
      </div>
      <button class="form__btn workout__details">Edit</button>
    </li>`;
    }
    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
        
      </div>
      <button class="form__btn workout__details">Edit</button>
    </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  clearWorkouts(e) {
    e.preventDefault();
    this.reset();
  }
  removeWorkout(e) {
    if (!e.target.classList.contains('btn__remove')) return;
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workIndex = this.#workouts.findIndex(
      work => work.id === workoutEl.dataset.id
    );
    this.#workouts.splice(workIndex, 1);

    localStorage.removeItem('workouts');
    this._setLocalStorage();
    const markers = document.querySelectorAll('.leaflet-marker-icon');
    markers.forEach(marker => marker.remove());
    const shadowPane = document.querySelector('.leaflet-shadow-pane');
    shadowPane.innerHTML = '';
    const runningPops = [...document.querySelectorAll('.running-popup')];
    const cyclingPops = [...document.querySelectorAll('.cycling-popup')];
    const allPops = [...runningPops, ...cyclingPops];
    allPops.forEach(pop => pop.remove());
    workoutEl.remove();
    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
    if (this.#workouts.length === 0) btnClear.style.opacity = 0;
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

///

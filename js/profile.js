// /js/profile.js
// v2.8.0 — Поддержка курения, алкоголя, хронических заболеваний и анализов (опционально)
import { HeaderController } from '/core/HeaderController.js';
import { ThemeManager } from '/core/themeManager.js';
import { MorpheProfile } from '/modules/profile.js';

document.addEventListener('DOMContentLoaded', async () => {
  await HeaderController.loadHeader();
  new ThemeManager();

  const form = document.getElementById('profileForm');
  const viewMode = document.getElementById('viewMode');
  const editMode = document.getElementById('editMode');
  const editBtn = document.getElementById('editBtn');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const progressBar = document.getElementById('progressBar');
  const profileProgressFill = document.getElementById('profileProgressFill');
  const profileProgressText = document.getElementById('profileProgressText');
  const profileStatus = document.getElementById('profileStatus');
  const feedback = document.getElementById('formFeedback');

  // Поля просмотра
  const fields = {
    name: document.getElementById('v-name'),
    gender: document.getElementById('v-gender'),
    age: document.getElementById('v-age'),
    height: document.getElementById('v-height'),
    weight: document.getElementById('v-weight'),
    activityPill: document.getElementById('v-activity-pill'),
    workoutType: document.getElementById('v-workoutType'),
    workoutLocation: document.getElementById('v-workoutLocation'),
    goalPill: document.getElementById('v-goal-pill'),
    greeting: document.getElementById('greeting'),
    allergies: document.getElementById('v-allergies'),
    injuries: document.getElementById('v-injuries'),
    trainingDays: document.getElementById('v-trainingDays')
  };

  const activityLabels = {
    '1.375': 'Лёгкая',
    '1.55': 'Средняя',
    '1.725': 'Высокая'
  };
  const activityColors = {
    '1.375': 'pill-ok',
    '1.55': 'pill-good',
    '1.725': 'pill-good'
  };
  const goalLabels = {
    lose: 'Сбросить вес',
    maintain: 'Поддерживать форму',
    gain: 'Набрать массу',
    health: 'Здоровье и самочувствие'
  };
  const goalColors = {
    lose: 'pill-bad',
    maintain: 'pill-ok',
    gain: 'pill-good',
    health: 'pill-neutral'
  };
  const workoutTypeLabels = {
    balanced: 'Силовые + кардио',
    cardio: 'Кардио',
    strength: 'Сила',
    light: 'Лёгкие'
  };
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  // === Вспомогательные функции ===
  function safeParseInt(value, fallback = 0) {
    const num = parseInt(value, 10);
    return isNaN(num) ? fallback : num;
  }
  function safeParseFloat(value, fallback = null) {
    const num = parseFloat(value);
    return isNaN(num) ? fallback : num;
  }

  // === Управление чекбоксами ===
  function setCheckboxGroup(name, values) {
    if (!Array.isArray(values)) return;
    values.forEach(val => {
      const checkbox = form.querySelector(`[name="${name}"][value="${val}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }

  // === Прогресс ===
  function updateProgress() {
    const totalFields = 16; // обновлённый счётчик
    let filled = 0;
    const d = profile.data || {};

    if (d.name?.trim()) filled++;
    if (d.gender) filled++;
    if (d.age > 0) filled++;
    if (d.height > 0) filled++;
    if (d.weight > 0) filled++;
    if (d.goal) filled++;
    if (d.smoking) filled++;
    if (d.alcohol) filled++;
    if (d.activityLevel > 0) filled++;
    if (d.workoutLocation) filled++;
    if (d.workoutType) filled++;
    if (d.workoutDuration > 0) filled++;
    if (d.preferredWorkoutTime) filled++;
    if (Array.isArray(d.trainingDays) && d.trainingDays.length >= 2) filled++;
    if (Array.isArray(d.allergies)) filled++;
    if (Array.isArray(d.injuries)) filled++;
    // chronicConditions и анализы — не в прогресс

    const percent = Math.round((filled / totalFields) * 100);
    profileProgressFill.style.width = `${percent}%`;
    profileProgressText.textContent = `${percent}%`;
    if (percent === 0) {
      profileStatus.textContent = 'Не начато';
    } else if (percent < 50) {
      profileStatus.textContent = 'Ещё немного!';
    } else if (percent < 90) {
      profileStatus.textContent = 'Почти готово!';
    } else {
      profileStatus.textContent = 'Полный профиль — молодец!';
    }
    return percent;
  }

  // === Отображение профиля ===
  function renderProfileView() {
    if (profile.isComplete() && profile.data) {
      const d = profile.data;
      const safeGet = (obj, key, fallback = '—') => obj && obj[key] !== undefined ? obj[key] : fallback;

      const allergies = Array.isArray(d.allergies) ? d.allergies : [];
      const injuries = Array.isArray(d.injuries) ? d.injuries : [];
      const trainingDays = Array.isArray(d.trainingDays) ? d.trainingDays : [];

      fields.name.textContent = safeGet(d, 'name');
      fields.gender.textContent = safeGet(d, 'gender') === 'male' ? 'Мужской' : 'Женский';
      fields.age.textContent = safeGet(d, 'age');
      fields.height.textContent = safeGet(d, 'height');
      fields.weight.textContent = safeGet(d, 'weight');
      fields.workoutType.textContent = workoutTypeLabels[safeGet(d, 'workoutType')] || '—';
      fields.workoutLocation.textContent = safeGet(d, 'workoutLocation') === 'gym' ? 'В зале' : 'Дома';
      fields.activityPill.textContent = activityLabels[safeGet(d, 'activityLevel')] || '—';
      fields.activityPill.className = `pill ${activityColors[safeGet(d, 'activityLevel')] || ''}`;
      fields.goalPill.textContent = goalLabels[safeGet(d, 'goal')] || '—';
      fields.goalPill.className = `pill ${goalColors[safeGet(d, 'goal')] || ''}`;
      fields.greeting.textContent = (d.name?.trim() || 'Пользователь');
      fields.allergies.textContent = allergies.length ? allergies.join(', ') : 'Нет';
      fields.injuries.textContent = injuries.length ? injuries.join(', ') : 'Нет';
      fields.trainingDays.textContent = trainingDays.length 
        ? trainingDays.map(d => dayNames[d]).join(', ') 
        : '—';

      viewMode.style.display = 'block';
      editMode.style.display = 'none';
    } else {
      viewMode.style.display = 'none';
      editMode.style.display = 'block';
    }
    updateProgress();
  }

  // === Инициализация ===
  const profile = new MorpheProfile();
  renderProfileView();

  // === Редактирование ===
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      viewMode.style.display = 'none';
      editMode.style.display = 'block';
      profile.fillForm(form);
      currentStep = 0;
      showCurrentStep();
    });
  }

  // === Навигация по шагам ===
  const steps = Array.from(document.querySelectorAll('.step'));
  let currentStep = 0;

  function showCurrentStep() {
    steps.forEach(step => step.classList.remove('active'));
    if (steps[currentStep]) {
      steps[currentStep].classList.add('active');
    }
    // Обновляем прогресс-бар (6 шагов → 100/6 ≈ 16.6%)
    progressBar.style.width = `${(currentStep + 1) * (100 / 6)}%`;
    nextBtn.textContent = currentStep === steps.length - 1 ? 'Сохранить изменения' : 'Далее →';
    prevBtn.style.display = currentStep > 0 ? 'inline-block' : 'none';
  }

  // === Условный шаг 6 (анализы) ===
  const wantsLabCheckbox = document.getElementById('wantsLabData');
  const step6 = document.querySelector('.step[data-step="6"]');

  if (wantsLabCheckbox && step6) {
    wantsLabCheckbox.addEventListener('change', () => {
      step6.style.display = wantsLabCheckbox.checked ? 'block' : 'none';
    });
  }

  // === Валидация и переход ===
  function nextStep() {
    const currentStepEl = steps[currentStep];
    const currentFields = currentStepEl.querySelectorAll('[required]');
    let valid = true;

    currentFields.forEach(field => {
      if (!field.checkValidity()) {
        field.reportValidity();
        valid = false;
      }
    });

    // Доп. валидация: минимум 2 дня тренировок (на шаге 4)
    if (currentStep === 3) {
      const selectedDays = form.querySelectorAll('input[name="trainingDays"]:checked');
      if (selectedDays.length < 2) {
        alert('⚠️ Выберите минимум 2 дня для тренировок.');
        valid = false;
      }
    }

    if (!valid) return;

    // Пропуск шага 6, если не нужен
    if (currentStep === 4 && step6 && step6.style.display === 'none') {
      currentStep = 5; // сразу к сохранению
      showCurrentStep();
      return;
    }

    if (currentStep === steps.length - 1) {
      submitForm();
    } else {
      currentStep++;
      showCurrentStep();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      // Если возвращаемся со скрытого шага 6 — прыгаем на шаг 5
      if (currentStep === 5 && step6 && step6.style.display === 'none') {
        currentStep = 4;
      } else {
        currentStep--;
      }
      showCurrentStep();
    }
  }

  function cancelEdit() {
    viewMode.style.display = 'block';
    editMode.style.display = 'none';
    renderProfileView();
  }

  // === Сохранение ===
  async function submitForm() {
    const fd = new FormData(form);
    try {
      const currentData = profile.data || {};
      const newData = {
        ...currentData,
        name: fd.get('name')?.toString().trim() || currentData.name,
        gender: fd.get('gender') || currentData.gender,
        age: safeParseInt(fd.get('age')) || currentData.age,
        height: safeParseFloat(fd.get('height')) || currentData.height,
        weight: safeParseFloat(fd.get('weight')) || currentData.weight,
        targetWeight: fd.get('targetWeight') ? safeParseFloat(fd.get('targetWeight')) : currentData.targetWeight,
        goal: fd.get('goal') || currentData.goal,
        smoking: fd.get('smoking') || currentData.smoking,
        alcohol: fd.get('alcohol') || currentData.alcohol,
        activityLevel: safeParseFloat(fd.get('activity')) || currentData.activityLevel,
        workoutType: fd.get('workoutType') || currentData.workoutType,
        workoutLocation: fd.get('workoutLocation') || currentData.workoutLocation,
        workoutDuration: safeParseInt(fd.get('workoutDuration')) || currentData.workoutDuration || 60,
        preferredWorkoutTime: fd.get('workoutTime') || currentData.preferredWorkoutTime || '19:00',
        allergies: fd.getAll('allergies'),
        injuries: fd.getAll('injuries'),
        chronicConditions: fd.getAll('chronicConditions'),
        trainingDays: fd.getAll('trainingDays').map(Number),
        wantsLabData: fd.get('wantsLabData') === 'on',
        lastBloodTestDate: fd.get('lastBloodTestDate') || null,
        hemoglobin: fd.get('hemoglobin') ? safeParseFloat(fd.get('hemoglobin')) : null,
        cholesterol: fd.get('cholesterol') ? safeParseFloat(fd.get('cholesterol')) : null,
        glucose: fd.get('glucose') ? safeParseFloat(fd.get('glucose')) : null,
        vitaminD: fd.get('vitaminD') ? safeParseFloat(fd.get('vitaminD')) : null,
        healthNotes: fd.get('healthNotes')?.toString().trim() || currentData.healthNotes || '',
        updatedAt: new Date().toISOString()
      };

      // Валидация обязательных полей
      if (!newData.name) throw new Error("Имя обязательно");
      if (newData.age <= 0) throw new Error("Возраст должен быть больше 0");
      if (newData.height <= 0) throw new Error("Рост должен быть больше 0");
      if (newData.weight <= 0) throw new Error("Вес должен быть больше 0");
      if (!newData.goal) throw new Error("Укажите цель");
      if (!newData.smoking) throw new Error("Укажите информацию о курении");
      if (!newData.alcohol) throw new Error("Укажите информацию об алкоголе");
      if (newData.trainingDays?.length < 2) throw new Error("Выберите минимум 2 тренировочных дня");

      profile.save(newData);

      // Обновление плана питания
      try {
        const { NutritionEngine } = await import('/core/nutritionEngine.js');
        const engine = new NutritionEngine({ data: newData, isComplete: true });
        const newPlan = {
          ...engine.calculateMacros(),
          generatedAt: new Date().toISOString(),
          basedOnWeight: newData.weight
        };
        localStorage.setItem('morphe_nutrition_plan', JSON.stringify(newPlan));
        console.log('✅ План питания обновлён');
      } catch (calcErr) {
        console.warn('⚠️ Не удалось обновить план питания:', calcErr);
      }

      renderProfileView();
      sessionStorage.removeItem('morphe-profile-draft');
      feedback.innerHTML = '<p class="success-text">✅ Профиль успешно обновлён!</p>';
      feedback.classList.add('show');
      setTimeout(() => feedback.classList.remove('show'), 3000);
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err);
      feedback.innerHTML = `<p class="error-text">❌ ${err.message || 'Не удалось сохранить профиль'}</p>`;
      feedback.classList.add('show');
      setTimeout(() => feedback.classList.remove('show'), 4000);
    }
  }

  // === Слушатели ===
  if (nextBtn) nextBtn.addEventListener('click', nextStep);
  if (prevBtn) prevBtn.addEventListener('click', prevStep);
  if (cancelBtn) cancelBtn.addEventListener('click', cancelEdit);

  // === Загрузка данных в форму ===
  if (profile.data) {
    const d = profile.data;
    setCheckboxGroup('allergies', d.allergies);
    setCheckboxGroup('injuries', d.injuries);
    setCheckboxGroup('chronicConditions', d.chronicConditions);
    setCheckboxGroup('trainingDays', d.trainingDays);

    // Восстановление wantsLabData
    if (d.wantsLabData && wantsLabCheckbox && step6) {
      wantsLabCheckbox.checked = true;
      step6.style.display = 'block';
    }
  }

  // === Клавиатура ===
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextStep();
    }
    if (e.key === 'Escape') {
      if (editMode.style.display === 'block') {
        cancelEdit();
      }
    }
  });

  // === Уведомления ===
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('🔔 Уведомления разрешены');
      }
    });
  }

  // === Автосохранение черновика ===
  form.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('change', () => {
      const draft = Object.fromEntries(new FormData(form));
      sessionStorage.setItem('morphe-profile-draft', JSON.stringify(draft));
    });
  });

  // === Восстановление черновика ===
  const draft = sessionStorage.getItem('morphe-profile-draft');
  if (draft) {
    const draftData = JSON.parse(draft);
    Object.keys(draftData).forEach(key => {
      const field = form.querySelector(`[name="${key}"]`);
      if (field) {
        if (field.type === 'radio' || field.type === 'checkbox') {
          const option = form.querySelector(`[name="${key}"][value="${draftData[key]}"]`);
          if (option) option.checked = true;
        } else {
          field.value = draftData[key];
        }
      }
    });

    // Восстановление wantsLabData для отображения шага 6
    if (draftData.wantsLabData === 'on' && wantsLabCheckbox && step6) {
      wantsLabCheckbox.checked = true;
      step6.style.display = 'block';
    }
  }

  showCurrentStep();
});
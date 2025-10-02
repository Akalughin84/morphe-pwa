// /js/profile.js
// v2.5.0 — Автоматическое обновление плана питания при сохранении профиля

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
  const progressBar = document.getElementById('progressBar');
  const profileProgressFill = document.getElementById('profileProgressFill');
  const profileProgressText = document.getElementById('profileProgressText');
  const profileStatus = document.getElementById('profileStatus');
  const feedback = document.getElementById('formFeedback');

  const steps = Array.from(document.querySelectorAll('.step'));
  let currentStep = 0;

  const profile = new MorpheProfile();

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
    greeting: document.getElementById('greeting')
  };

  const activityLabels = {
    '1.2': 'Минимальная',
    '1.375': 'Лёгкая',
    '1.55': 'Средняя',
    '1.725': 'Высокая',
    '1.9': 'Очень высокая'
  };

  const activityColors = {
    '1.2': '',
    '1.375': 'pill-ok',
    '1.55': 'pill-ok',
    '1.725': 'pill-good',
    '1.9': 'pill-good'
  };

  const goalLabels = {
    lose: 'Сбросить вес',
    maintain: 'Поддерживать форму',
    gain: 'Набрать массу'
  };

  const goalColors = {
    lose: 'pill-bad',
    maintain: 'pill-ok',
    gain: 'pill-good'
  };

  const workoutTypeLabels = {
    balanced: 'Силовые + кардио',
    cardio: 'Кардио',
    strength: 'Сила',
    light: 'Лёгкие'
  };

  function safeParseInt(value, fallback = 0) {
    const num = parseInt(value, 10);
    return isNaN(num) ? fallback : num;
  }

  function safeParseFloat(value, fallback = 0) {
    const num = parseFloat(value);
    return isNaN(num) ? fallback : num;
  }

  function updateProgress() {
    const totalFields = 9;
    let filled = 0;
    const d = profile.data || {};

    if (d.name?.trim()) filled++;
    if (d.gender) filled++;
    if (d.age > 0) filled++;
    if (d.height > 0) filled++;
    if (d.weight > 0) filled++;
    if (d.activityLevel > 0) filled++;
    if (d.workoutLocation) filled++;
    if (d.workoutType) filled++;
    if (d.goal) filled++;

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

  function renderProfileView() {
    if (profile.isComplete() && profile.data) {
      const d = profile.data;
      fields.name.textContent = d.name || '—';
      fields.gender.textContent = d.gender === 'male' ? 'Мужской' : 'Женский';
      fields.age.textContent = d.age || '—';
      fields.height.textContent = d.height || '—';
      fields.weight.textContent = d.weight || '—';
      fields.workoutType.textContent = workoutTypeLabels[d.workoutType] || '—';
      fields.workoutLocation.textContent = d.workoutLocation === 'gym' ? 'В зале' : 'Дома';

      fields.activityPill.textContent = activityLabels[d.activityLevel] || '—';
      fields.activityPill.className = `pill ${activityColors[d.activityLevel] || ''}`;

      fields.goalPill.textContent = goalLabels[d.goal] || '—';
      fields.goalPill.className = `pill ${goalColors[d.goal] || ''}`;

      fields.greeting.textContent = d.name || 'Пользователь';

      viewMode.style.display = 'block';
      editMode.style.display = 'none';
    } else {
      viewMode.style.display = 'none';
      editMode.style.display = 'block';
    }
    updateProgress();
  }

  renderProfileView();

  editBtn.addEventListener('click', () => {
    viewMode.style.display = 'none';
    editMode.style.display = 'block';
    profile.fillForm(form);
    currentStep = 0;
    showCurrentStep();
  });

  function showCurrentStep() {
    steps.forEach(step => step.classList.remove('active'));
    if (steps[currentStep]) {
      steps[currentStep].classList.add('active');
    }

    progressBar.style.width = `${25 + currentStep * 25}%`;
    nextBtn.textContent = currentStep === steps.length - 1 ? 'Сохранить изменения' : 'Далее →';
    prevBtn.style.display = currentStep > 0 ? 'inline-block' : 'none';
  }

  function nextStep() {
    const currentFields = steps[currentStep].querySelectorAll('[required]');
    let valid = true;

    currentFields.forEach(field => {
      if (!field.checkValidity()) {
        field.reportValidity();
        valid = false;
      }
    });

    if (!valid) return;

    if (currentStep === steps.length - 1) {
      submitForm();
    } else {
      currentStep++;
      showCurrentStep();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      showCurrentStep();
    }
  }

  async function submitForm() {
    const fd = new FormData(form);

    try {
      const data = {
        name: fd.get('name')?.toString().trim(),
        gender: fd.get('gender'),
        age: safeParseInt(fd.get('age')),
        height: safeParseFloat(fd.get('height')),
        weight: safeParseFloat(fd.get('weight')),
        targetWeight: fd.get('targetWeight') ? safeParseFloat(fd.get('targetWeight')) : null,
        activityLevel: safeParseFloat(fd.get('activity')),
        goal: fd.get('goal'),
        workoutType: fd.get('workoutType'),
        workoutLocation: fd.get('workoutLocation'),
        createdAt: profile.data?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!data.name) throw new Error("Имя обязательно");
      if (data.age <= 0) throw new Error("Возраст должен быть больше 0");
      if (data.height <= 0) throw new Error("Рост должен быть больше 0");
      if (data.weight <= 0) throw new Error("Вес должен быть больше 0");

      profile.save(data);

      // === 🔥 КЛЮЧЕВОЕ ДОБАВЛЕНИЕ: пересчёт и сохранение плана питания ===
      try {
        const { NutritionEngine } = await import('/core/nutritionEngine.js');
        const engine = new NutritionEngine({  data: profile.data, isComplete: true });
        const newPlan = {
          ...engine.calculateMacros(),
          generatedAt: new Date().toISOString(),
          basedOnWeight: profile.data.weight
        };
        localStorage.setItem('morphe_nutrition_plan', JSON.stringify(newPlan));
        console.log('✅ План питания обновлён на основе текущего веса:', profile.data.weight, 'кг');
      } catch (calcErr) {
        console.warn('⚠️ Не удалось обновить план питания:', calcErr);
      }

      renderProfileView();

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

  nextBtn.addEventListener('click', nextStep);
  prevBtn.addEventListener('click', prevStep);

  form.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextStep();
    }
    if (e.key === 'Escape') {
      if (editMode.style.display === 'block') {
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
      }
    }
  });

  showCurrentStep();
});
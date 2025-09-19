// modules/pdfExporter.js

export class PDFExporter {
  async exportProgram(program, profile) {
    // Импортируем jsPDF (через CDN)
    if (!window.jspdf) {
      await this.loadJsPDF();
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Morphe — Твоя программа тренировок', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Имя: ${profile.name || '—'}`, 20, 35);
    doc.text(`Цель: ${this.localizeGoal(profile.goal)}`, 20, 45);
    doc.text(`Уровень: ${this.localizeExperience(profile.experience)}`, 20, 55);

    let y = 70;
    for (let day in program) {
      const workout = program[day];
      doc.setFontSize(16);
      doc.text(`День ${day.replace('day', '')}: ${workout.name}`, 20, y);
      y += 10;

      doc.setFontSize(12);
      workout.exercises.forEach(ex => {
        doc.text(`• ${ex.name} — ${ex.sets} × ${ex.reps}`, 25, y);
        y += 8;
      });
      y += 10;

      if (y > 250) {
        doc.addPage();
        y = 20;
      }
    }

    doc.save('morphe-program.pdf');
  }

  localizeGoal(goal) {
    const map = {
      muscle: "Набор мышц",
      fatloss: "Похудение",
      health: "Здоровье"
    };
    return map[goal] || goal;
  }

  localizeExperience(exp) {
    const map = {
      beginner: "Новичок",
      intermediate: "Средний",
      advanced: "Продвинутый"
    };
    return map[exp] || exp;
  }

  async loadJsPDF() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}
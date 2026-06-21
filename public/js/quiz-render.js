function renderQuiz(container, quizQuestions) {
  if (!quizQuestions || !quizQuestions.length) return;
  container.classList.add('quiz-block');
  container.innerHTML = '';

  quizQuestions.forEach((q, qIndex) => {
    const qDiv = document.createElement('div');
    qDiv.style.marginBottom = qIndex < quizQuestions.length - 1 ? '24px' : '0';

    const questionEl = document.createElement('div');
    questionEl.className = 'quiz-question';
    questionEl.textContent = `${qIndex + 1}. ${q.question}`;
    qDiv.appendChild(questionEl);

    const optionsEl = document.createElement('div');
    optionsEl.className = 'quiz-options';

    const explanationEl = document.createElement('div');
    explanationEl.className = 'quiz-explanation';
    explanationEl.textContent = q.explanation || '';

    q.options.forEach((opt, oIndex) => {
      const optEl = document.createElement('div');
      optEl.className = 'quiz-option';
      optEl.textContent = opt;
      optEl.addEventListener('click', () => {
        const allOptions = optionsEl.querySelectorAll('.quiz-option');
        allOptions.forEach(o => o.classList.add('disabled'));
        if (oIndex === q.correctIndex) {
          optEl.classList.add('selected-correct');
        } else {
          optEl.classList.add('selected-wrong');
          allOptions[q.correctIndex]?.classList.add('reveal-correct');
        }
        explanationEl.classList.add('show');
      });
      optionsEl.appendChild(optEl);
    });

    qDiv.appendChild(optionsEl);
    qDiv.appendChild(explanationEl);
    container.appendChild(qDiv);
  });
}

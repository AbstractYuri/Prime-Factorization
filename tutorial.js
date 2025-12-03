document.addEventListener("DOMContentLoaded", () => {
  const chatWindow = document.getElementById("chat-window");
  const userActions = document.getElementById("user-actions");

  // ---------- Helper Functions ----------
  function smallestDivisor(n) {
    if (n % 2 === 0) return 2;
    const L = Math.floor(Math.sqrt(n));
    for (let i = 3; i <= L; i += 2) if (n % i === 0) return i;
    return n;
  }

  function getDivisionSteps(n) {
    const out = [];
    let x = n;
    while (x > 1) {
      const d = smallestDivisor(x);
      const q = x / d;
      out.push({ divisor: d, dividend: x, quotient: q });
      x = q;
    }
    return out;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const userNumber = parseInt(urlParams.get('number'), 10);
  const startNumber = (userNumber && userNumber >= 2) ? userNumber : 30;
  const STORAGE_KEY = 'ireneo-chat-state';

  const professorAvatar = `
    <div class="avatar"><img src="assets/184882712.png" alt="Professor Ireneo" /></div>
  `;

  const conversation = [
    {
      speaker: "bot",
      text: "Hello! I'm Professor Ireneo. I can show you how we compute the prime factorization of a number. Would you like to start?",
      actions: [{ text: "Yes, let's start!", next: 1 }],
    },
    {
      speaker: "user",
      text: "Yes, let's start!",
      next: 2,
    },
    {
      speaker: "bot",
      text: `Great! Let's walk through how to factor your number: <strong>${startNumber}</strong>.`,
      next: 3,
    },
    {
      speaker: "bot",
      text: () => `First, we find the smallest prime number that divides <strong>${startNumber}</strong> without a remainder. That would be <strong>${smallestDivisor(startNumber)}</strong>.`,
      actions: [{ text: "What happens next?", next: 4 }],
    },
    {
      speaker: "user",
      text: "What happens next?",
      next: 5,
    },
    {
      speaker: "bot",
      text: () => {
        const steps = getDivisionSteps(startNumber);
        if (steps.length === 1) {
          return `Since <strong>${startNumber}</strong> is a prime number, its only prime factor is itself!`;
        }
        const nextDividend = steps[0].quotient;
        return `We divide <strong>${startNumber}</strong> by <strong>${steps[0].divisor}</strong>, which gives us <strong>${nextDividend}</strong>. Now we repeat the process with <strong>${nextDividend}</strong>.`;
      },
      actions: () => {
        const steps = getDivisionSteps(startNumber);
        if (steps.length > 1) {
          return [{ text: "Okay, what's next?", next: 6 }];
        }
        return [{ text: "Restart tutorial.", next: 0 }];
      }
    },
    {
      speaker: "user",
      text: "Okay, what's next?",
      next: 7,
    },
    {
      speaker: "bot",
      text: () => {
        const steps = getDivisionSteps(startNumber);
        let message = "We keep repeating this process:<br><ul>";
        steps.slice(1).forEach(step => {
          message += `<li>Divide <strong>${step.dividend}</strong> by <strong>${step.divisor}</strong> to get <strong>${step.quotient}</strong>.</li>`;
        });
        message += "</ul>We stop when we reach 1.";
        return message;
      },
      actions: [{ text: "So, what are the prime factors?", next: 8 }],
    },
    {
      speaker: "user",
      text: "So, what are the prime factors?", // This was pointing to the wrong index
      next: 10,
    },
    {
      speaker: "bot",
      text: () => `Once we reach 1, we're done! We just collect all the divisors we used. For <strong>${startNumber}</strong>, the prime factors are <strong>${getDivisionSteps(startNumber).map(s => s.divisor).join('</strong>, <strong>')}</strong>.`,
      next: 10,
    },
    {
      speaker: "bot",
      text: () => `So, the prime factorization of <strong>${startNumber}</strong> is <strong>${getDivisionSteps(startNumber).map(s => s.divisor).join(' × ')}</strong>. You can see this visualized on the main page. Would you like to start over?`,
      actions: [{ text: "Yes, restart tutorial.", next: 0 }],
    },
  ];

  function saveState(stepIndex) {
    const state = { step: stepIndex, number: startNumber };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // If the number is different, reset the conversation
        if (state.number === startNumber) {
          return state;
        }
      } catch (e) {
        console.error("Failed to parse saved state:", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return { step: 0, number: startNumber };
  }

  function clearStateAndRestart() {
    localStorage.removeItem(STORAGE_KEY);
    chatWindow.innerHTML = "";
    showStep(0);
  }

  function showStep(index) {
    const step = conversation[index];
    if (!step) return;

    saveState(index);

    const text = typeof step.text === 'function' ? step.text() : step.text;

    const messageEl = document.createElement("div");
    messageEl.classList.add("chat-message", `${step.speaker}-message`);
    if (step.speaker === 'bot') {
      messageEl.innerHTML = `${professorAvatar}<div class="message-bubble">${text}</div>`;
    } else {
      messageEl.innerHTML = `<div class="message-bubble">${text}</div>`;
    }
    chatWindow.appendChild(messageEl);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    userActions.innerHTML = "";

    const actions = typeof step.actions === 'function' ? step.actions() : step.actions;

    if (actions) {
      actions.forEach((action) => {
        const button = document.createElement("button");
        button.className = "btn-secondary";
        button.textContent = action.text;
        button.onclick = () => {
          if (action.next === 0) { // Restart action
            clearStateAndRestart();
            return;
          }
          // If user action, find the corresponding message to display
          const userResponseStep = conversation.find((s, i) => s.speaker === 'user' && s.text === action.text && i >= index);
          if (userResponseStep) {
            showStep(conversation.indexOf(userResponseStep));
          } else {
            showStep(action.next);
          }
        };
        userActions.appendChild(button);
      });
    } else if (step.next !== undefined) {
      setTimeout(() => {
        showStep(step.next);
      }, 1200);
    }
  }

  function restoreConversation(endStep) {
    chatWindow.innerHTML = "";
    for (let i = 0; i < endStep; i++) {
      const step = conversation[i];
      const text = typeof step.text === 'function' ? step.text() : step.text;
      const messageEl = document.createElement("div");
      messageEl.classList.add("chat-message", `${step.speaker}-message`);
      if (step.speaker === 'bot') {
        messageEl.innerHTML = `${professorAvatar}<div class="message-bubble">${text}</div>`;
      } else {
        messageEl.innerHTML = `<div class="message-bubble">${text}</div>`;
      }
      chatWindow.appendChild(messageEl);
    }
    showStep(endStep);
  }

  const initialState = loadState();
  restoreConversation(initialState.step);
});
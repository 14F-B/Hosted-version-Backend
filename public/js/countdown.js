(function() {
  "use strict";

  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  let countdown = select('.countdown');
  const output = countdown.innerHTML;

  const countDownDate = function() {
    let timeleft = new Date(countdown.getAttribute('data-count')).getTime() - new Date().getTime();
    timeleft -= 3600000 // 1 óra kivonás az időzóna miatt

    let days = Math.floor(timeleft / (1000 * 60 * 60 * 24));
    let hours = Math.floor((timeleft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let minutes = Math.floor((timeleft % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((timeleft % (1000 * 60)) / 1000);

    if (timeleft < 0) {
      countdown.innerHTML = "Az esemény tart";
      clearInterval(countDownInterval);
      return;
    }

    countdown.innerHTML = output.replace('%d', days).replace('%h', hours).replace('%m', minutes).replace('%s', seconds);
  }

  const countDownInterval = setInterval(countDownDate, 1000);
})();
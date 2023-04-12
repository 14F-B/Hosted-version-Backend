(function() {
  "use strict";

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Easy on scroll event listener 
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }

  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select('#navbar .scrollto', true)
  const navbarlinksActive = () => {
    let position = window.scrollY + 200
    navbarlinks.forEach(navbarlink => {
      if (!navbarlink.hash) return
      let section = select(navbarlink.hash)
      if (!section) return
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        navbarlink.classList.add('active')
      } else {
        navbarlink.classList.remove('active')
      }
    })
  }
  window.addEventListener('load', navbarlinksActive)
  onscroll(document, navbarlinksActive)

  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let header = select('#header')
    let offset = header.offsetHeight

    let elementPos = select(el).offsetTop
    window.scrollTo({
      top: elementPos - offset,
      behavior: 'smooth'
    })
  }

  /**
   * Toggle .header-scrolled class to #header when page is scrolled
   */
  let selectHeader = select('#header')
  let selectTopbar = select('#topbar')
  if (selectHeader) {
    const headerScrolled = () => {
      if (window.scrollY > 100) {
        selectHeader.classList.add('header-scrolled')
        if (selectTopbar) {
          selectTopbar.classList.add('topbar-scrolled')
        }
      } else {
        selectHeader.classList.remove('header-scrolled')
        if (selectTopbar) {
          selectTopbar.classList.remove('topbar-scrolled')
        }
      }
    }
    window.addEventListener('load', headerScrolled)
    onscroll(document, headerScrolled)
  }

  /**
   * Back to top button
   */
  let backtotop = select('.back-to-top')
  if (backtotop) {
    const toggleBacktotop = () => {
      if (window.scrollY > 100) {
        backtotop.classList.add('active')
      } else {
        backtotop.classList.remove('active')
      }
    }
    window.addEventListener('load', toggleBacktotop)
    onscroll(document, toggleBacktotop)
  }

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function(e) {
    select('#navbar').classList.toggle('navbar-mobile')
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
  })

  /**
   * Mobile nav dropdowns activate
   */
  on('click', '.navbar .dropdown > a', function(e) {
    if (select('#navbar').classList.contains('navbar-mobile')) {
      e.preventDefault()
      this.nextElementSibling.classList.toggle('dropdown-active')
    }
  }, true)

  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on('click', '.scrollto', function(e) {
    if (select(this.hash)) {
      e.preventDefault()

      let navbar = select('#navbar')
      if (navbar.classList.contains('navbar-mobile')) {
        navbar.classList.remove('navbar-mobile')
        let navbarToggle = select('.mobile-nav-toggle')
        navbarToggle.classList.toggle('bi-list')
        navbarToggle.classList.toggle('bi-x')
      }
      scrollto(this.hash)
    }
  }, true)

  /**
   * Scroll with ofset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash)
      }
    }
  });

  /**
   * Preloader
   */
  let preloader = select('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove()
    });
  }

  /**
   * Menu isotope and filter
   */
  window.addEventListener('load', () => {
    let menuContainer = select('.menu-container');
    if (menuContainer) {
      let menuIsotope = new Isotope(menuContainer, {
        itemSelector: '.menu-item',
        layoutMode: 'fitRows'
      });

      let menuFilters = select('#menu-flters li', true);

      on('click', '#menu-flters li', function(e) {
        e.preventDefault();
        menuFilters.forEach(function(el) {
          el.classList.remove('filter-active');
        });
        this.classList.add('filter-active');

        menuIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        menuIsotope.on('arrangeComplete', function() {
          AOS.refresh()
        });
      }, true);
    }

  });

  /**
   * Glightbox 
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  const mediaLightbox = GLightbox({
    selector: '.media'
  });


  /**
   * Animált megjelenés
   */
  window.addEventListener('load', () => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    })
  });

})()

// Esemény / Users tábla mutatása
function eventShow() {
  var eventsShow = document.getElementById('eventTable');
  var usersShow = document.getElementById('usersTable');
  if (eventsShow.style.display === 'none') {
    eventsShow.style.display = 'block';
    usersShow.style.display ='none';
  } else {
    eventsShow.style.display = 'none';
    usersShow.style.display ='block';

  }
  var button = document.getElementById("btn_changeTable");
  if (button.textContent === "Felhasználók listája") {
    button.textContent = "Események listája";
  } else {
    button.textContent = "Felhasználók listája";
  }
}

// Oldal újratöltése gombra kattintás esetén
function refreshsite() {
const refreshButton = document.getElementById("btn_refresh");

  refreshButton.addEventListener("click", function() {
  window.location.reload(true);
    

});
}


// Adatok mentése excel táblázatba
function exportevents(type){
  var eventdata = document.getElementById('tbl_events');
  var excelFile = XLSX.utils.table_to_book(eventdata, {sheet: "Események (events)"});
  var now = new Date();
  var datetime = now.toLocaleString().replace(/[/:\s]/g, '_');


  XLSX.write(excelFile, { bookType: type, bookSST: true, type: 'base64' });
  XLSX.writeFile(excelFile,"export_events_"+ datetime +"."+ type);
}


function exportusers(type){

  var usersdata = document.getElementById('tbl_users');
  var excelFile = XLSX.utils.table_to_book(usersdata, {sheet: "Felhasználok (users)"});
  var now = new Date();
  var datetime = now.toLocaleString().replace(/[/:\s]/g, '_');

  XLSX.write(excelFile, { bookType: type, bookSST: true, type: 'base64' });
  XLSX.writeFile(excelFile,"export_users_"+ datetime +"."+ type);
}



function setStyleCookie(style) {
  document.cookie = `selectedStyle=${style}; max-age=${-1}; path=/`;
}

function getStyleCookie() {
  const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
    const [name, value] = cookie.split('=');
    return { ...acc, [name]: value };
  }, {});

  return cookies.selectedStyle || 'light';
}

// Dark - Light stílus
// function toggleStylesheet() {
//   const style_light = document.getElementById('style_light');
//   const style_dark = document.getElementById('style_dark');
//   const button = document.getElementById('style-toggle');


//   if (style_light.disabled) {
//     button.innerHTML = '<i class="bi bi-moon-fill text-dark"></i>';

//     style_light.disabled = false;
//     style_dark.disabled = true;
//     setStyleCookie('light');
//   } else {
//     button.innerHTML = '<i class="bi bi-sun-fill text-light"></i>';

//     style_light.disabled = true;
//     style_dark.disabled = false;
//     setStyleCookie('dark');

//   }
// }

// window.addEventListener('load', () => {
//   const selectedStyle = getStyleCookie();
//   const style_light = document.getElementById('style_light');
//   const style_dark = document.getElementById('style_dark');
//   const button = document.getElementById('style-toggle');

//   if (selectedStyle === 'dark') {
//     style_light.disabled = true;
//     style_dark.disabled = false;
//     button.innerHTML = '<i class="bi bi-sun-fill text-light"></i>';
//   } else {
//     style_light.disabled = false;
//     style_dark.disabled = true;
//     button.innerHTML = '<i class="bi bi-moon-fill text-dark"></i>';
//   }
// });


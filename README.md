# Hosted version (Backend)
[Swagger documentation - https://goeventapiservice.cyclic.app ](https://goeventapiservice.cyclic.app)

## ÉRTÉKELÉSHEZ INFORMÁCIÓK  
- Swagger minden route-ot kiszolgál, beállítottuk hogy lehessen tesztelni autentikáció/ megkülönböztetés nélkül.  
- Esemény/ Felhasználó törlés esetenként többszöri "Execute" hatására törlődik adatbázisból  
- Példa egy partner oldal és egy olyan oldalra aki ismerte a route-okat azonban nem jogosult a használatára:  
  - Hálózatunkba csatlakozott oldal: https://goeventdev.netlify.app/  
  - Külsős oldal, aki csak GET kéréseket kérdezhet le:  https://hosted-version-frontend.vercel.app/  
  
Belépési adatok: 
Admin: goeventhungary@gmail.com **jelszó:** goevent_ABR  
Általános user: soosliza0712@freemail.hu **jelszó:** soosliza0712  



## Ismertető
Ez a repository a GO EVENT! API szolgáltatása, melyen keresztül adatokat tudunk lekérni és felvinni. Az alkalmazás Node.js-ben írodott.

## Függőségek:
animate.css: ^4.1.1  
aos: ^2.3.4  
axios: ^1.3.3  
bootstrap: ^5.0.0  
bootstrap-icons: ^1.10.3  
bootstrap-vue: ^2.23.1  
boxicons: ^2.1.4  
countdown: ^2.6.0  
css: ^3.0.0  
glightbox: ^3.2.0  
jspdf: ^2.5.1  
jspdf-autotable: ^3.5.28  
jspdf-font: ^1.0.7  
save: ^2.9.0  
swiper: ^9.1.1  
vue: ^3.2.47  
vue-router: ^4.1.6  
vueisotope: ^3.1.2  
vuex: ^4.1.0  
vuex-persistedstate: ^4.1.0  

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('offline-worker.js').then(() => {
    console.log('offline-worker.js registered');
  });
}

window.ga = window.ga || function ga() {
  (ga.q = ga.q || []).push(arguments);
};
const ga = window.ga;
ga.l = Date.now();
ga('create', 'UA-XXXXX-Y', 'auto');

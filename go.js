// Sends visitors of the old address to the new site, keeping the page they asked for and carrying their sign-in and badges along.
(function(){
  var NEW = 'https://linearvibrationstutorial.pages.dev';
  var path = location.pathname.replace(/^\/VibrationTutorial/i, '') || '/';
  path = path.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');   // the new host serves free.html as /free
  var q = new URLSearchParams(location.search), data = {};
  try { for (var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if (k && k.indexOf('vlab-') === 0) data[k] = localStorage.getItem(k); } } catch (e){}
  if (Object.keys(data).length){
    var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    q.set('vlab', b64);
  }
  var qs = q.toString();
  location.replace(NEW + path + (qs ? '?' + qs : '') + location.hash);
})();

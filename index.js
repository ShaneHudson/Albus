'use strict';

const Hapi = require('hapi'),
      fs = require('fs'),
      hapi = require('hapi'),
      Inert = require('inert'),
      phantom = require('phantom');

const server = new Hapi.Server();
server.connection({ port: process.env.PORT || 3000 });

server.register(require('vision'), (err) => {

  server.views({
    engines: {
      html: require('handlebars')
    },
    relativeTo: __dirname,
    path: 'templates'
  });

});

server.route({
  method: 'GET',
  path: '/',
  handler: function (request, reply) {
    reply.view('index', {
      image: "/default_image.svg",
      filename: "default_image.svg"
    });
  }
});

server.route({
  method: 'GET',
  path: '/edgedetect/{filename}',
  handler: function (request, reply) {
    reply.view('edgedetect', {
      image: "/uploads/" + request.params.filename,
      filename: request.params.filename
    });
  }
});

server.register(Inert, function () {
  server.route({
    method: "GET",
    path: "/{path*}",
    handler: {
      directory: {
        path: "./public",
        listing: false,
        index: false
      }
    }
  });
});

server.route({
  method: 'POST',
  path: '/',
  config: {
    payload: {
      maxBytes: 209715200,
      output: 'stream',
      parse: true
    },
    handler: function (request, reply) {
      var file = request.payload.image;
      var filename = file.hapi.filename;
      var stream = request.payload.image.pipe(fs.createWriteStream('public/uploads/' + filename));
      var _ph, _page;

      stream.on('finish', function () {
        phantom.create()
          .then(function (ph)  {
            _ph = ph;
            return _ph.createPage();
          })
          .then(function (page) {
            _page = page;
            return _page.open("http://localhost:3000/edgedetect/" + filename);
          })
          .then(function (status) {
            _page.render("public/output/" + filename, function() {});
            return _page.property('content');
          })
          .then(function (content) {
            fs.readFile("public/output/" + filename, function(err,data){
              reply.view('index', {
                image: "output/" + filename,
                filename: filename
              });
              _page.close();
              _ph.exit();
            });
          });
      });
    }
  }
});


server.start((err) => {

  if (err) {
    throw err;
  }
  console.log(`Server running at: ${server.info.uri}`);
});

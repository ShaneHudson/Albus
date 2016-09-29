var colouringBook = (function() {
  document.body.classList.remove('no-js');

  // Only show checkbox hacks when js exists
  // This prevents them showing up in UAs without css or js
  var template = document.querySelector('#js-checkboxes');
  document.body.innerHTML = template.innerHTML + document.body.innerHTML;

  // Only show toolbox when js is enabled
  // this works for UAs with no css too.
  var template = document.querySelector('#js-tools');
  document.body.innerHTML = document.body.innerHTML + template.innerHTML;

  // Register our service-worker
  if (navigator.serviceWorker) {
    navigator.serviceWorker.register('serviceworker.js', {
      scope: '/'
    });
    window.addEventListener('load', function() {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({'command': 'trimCaches'});
      }
    });
  }

  var drop = document.createElement('canvas');
  drop.setAttribute('class', "js-drop");
  document.body.appendChild(drop);
  var save = document.querySelector(".js-save");
  var ctx = drop.getContext('2d');
  var drawing;
  var blur = true;

  ctx.imageSmoothingEnabled = true;
  var serverEdgeDetection = false;

  var offsetY = 0;

  /* These are to set the canvas to full width */
  function setSize() {
    var background_image = document.querySelector('img');
    var computed = getComputedStyle(background_image);

    drop.height = parseInt(computed.getPropertyValue('max-height'), 10);
    drop.width = parseInt(computed.getPropertyValue('max-width'), 10);
    offsetY = -parseInt(computed.getPropertyValue('margin-top'), 10);
  }

  setSize();

  /* If canvas blur doesn't exist then lazyload a blur script */
  if ('undefined' === typeof ctx.filter)  {
    var script = document.createElement('script');
    script.src = "/vendor/stackblur.min.js";
    document.body.appendChild(script);
  }

  var toolbox = {
    brush: {
      type: "round",
      colour: "#0000ff",
      opacity: 100,
      size: 5,
      types: {}
    }
  };

  toolbox.brush.types["round"] = {
    startPath: function(e) {
      var clientX = e.clientX || e.targetTouches[0].clientX;
      var clientY = e.clientY || e.targetTouches[0].clientY;
      var rgb = hexToRgb(toolbox.brush.colour);

      ctx.strokeStyle = "rgba(" + rgb["r"] + "," +rgb["g"] + "," + rgb["b"] + "," + toolbox.brush.opacity/100 + ")";
      console.log(toolbox.brush.colour);
      ctx.lineWidth = toolbox.brush.size;

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(clientX + toolbox.brush.size, clientY + offsetY + toolbox.brush.size);
      drawing = true;
      lastPoint = { x: clientX, y: clientY + offsetY };
    },

    mouseMove: function(e) {
      var clientX = e.clientX || e.targetTouches[0].clientX;
      var clientY = e.clientY || e.targetTouches[0].clientY;
      ctx.lineTo(clientX, clientY + offsetY);
      ctx.stroke();
    }
  };

  drop.addEventListener('dragover', preventDefault);
  drop.addEventListener('dragenter', preventDefault);
  drop.addEventListener('drop', handleDrop);


  drop.addEventListener('mousedown', startPath);
  drop.addEventListener('touchstart', startPath);

  drop.addEventListener('mouseup', function() {
    drawing = false;
  });

  drop.addEventListener('touchend', function() {
    drawing = false;
  });
  drop.addEventListener('mousemove', handleDrawing);
  drop.addEventListener('touchmove', handleDrawing);

  save.addEventListener('click', saveCanvas);

  document.querySelector('#image-upload-splash').addEventListener('change', triggerSubmit);
  document.querySelector('#image-upload-tools').addEventListener('change', triggerSubmit);

  function triggerSubmit (e)  {
    this.nextElementSibling.click();
  }


  function preventDefault(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    return false;
  }

  function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";

    var file = e.dataTransfer.files[0];
    handleFile(file);
  }

  document.querySelector('.js-splash-uploader').addEventListener('submit', submitUploader);
  document.querySelector('.js-tools-uploader').addEventListener('submit', submitUploader);

  function submitUploader (e)  {
    if (serverEdgeDetection) return;
    e.stopPropagation();
    e.preventDefault();
    var file = e.target.children[1].files[0];
    handleFile(file);
  }

  function handleFile(file) {
    var image = new Image();

    var reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (function() {
      return function(e)  {
        image.src = e.target.result;
        var checkbox = document.querySelector('#splash-toggle');
        checkbox.checked = false;
        document.querySelector('img').remove();
        var link = document.querySelector('.js-edge-download');
        link.setAttribute('href', e.target.result);
        link.setAttribute('download', e.target.name);
      };
    })();

    image.onload = function() {
      if ('undefined' !== typeof ctx.filter) {
        ctx.filter = "blur(1.2px)";
        ctx.drawImage(image, 0, 0);
      }
      else if ('undefined' !== typeof StackBlur) StackBlur.image(image, canvas, 2, false);
      else {
        blur = false;
        ctx.drawImage(image, 0, 0);
      }
      var originalData = ctx.getImageData(0, 0, drop.width, drop.height);
      findEdges(originalData, ctx, drop, blur);
    };
  }

  function startPath(e)  {
    toolbox.brush.types[toolbox.brush.type].startPath(e);
  }

  function handleDrawing(e)  {
    if (drawing == true) toolbox.brush.types[toolbox.brush.type].mouseMove(e);
  }

  function saveCanvas()  {
    save.href = drop.toDataURL("image/png");
    save.download = "colouringBook.png";
  }

  var el_brush_types = document.querySelectorAll('[name=toolbox-brush-type]');
  brushType = document.querySelector('[name=toolbox-brush-type]:checked').value;
  el_brush_types.forEach(function(el) {
    el.addEventListener('click', function(e)  {
      toolbox.brush.type = el.value;
    });
  });


  var el_brush_sizes = document.querySelectorAll('[name=toolbox-brush-size]');
  var el_brush_size = document.querySelector('#tb-brush-size');

  toolbox.brush.size = parseFloat(el_brush_size.value);
  el_brush_sizes.forEach(function(el) {
    el.addEventListener('click', function(e)  {
      toolbox.brush.size = parseFloat(el.value);
    });
  });

  el_brush_size.addEventListener('change', function(e)  {
    toolbox.brush.size = parseFloat(el_brush_size.value);
  });

  var el_brush_colour = document.querySelector("#tb-brush-colour");
  toolbox.brush.colour = el_brush_colour.value;
  el_brush_colour.addEventListener("input", function(e)  {
    toolbox.brush.colour = el_brush_colour.value;
  });



  var el_brush_opacity = document.querySelector('#tb-brush-opacity');
  el_brush_opacity.addEventListener('change', function(e)  {
    toolbox.brush.opacity = parseFloat(el_brush_opacity.value);
  });

})();

// http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
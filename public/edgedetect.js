function findEdges(originalData, ctx, canvas, blur) {
  var output = ctx.createImageData(canvas.width, canvas.height);

  var w = originalData.width, h = originalData.height;
  var inputData = originalData.data;
  var outputData = output.data;
  var threshold = 12;
  if (!blur) threshold = 30;

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4;

      outputData[i] = inputData[i - w*4 - 4] +   inputData[i - w*4] + inputData[i - w*4 + 4] +
        inputData[i - 4]       -   8*inputData[i]     + inputData[i + 4] +
        inputData[i + w*4 - 4] +   inputData[i + w*4] + inputData[i + w*4 + 4];

      if (outputData[i] < threshold)
      {
        outputData[i] = 255;
        outputData[i+1] = 255;
        outputData[i+2] = 255;
      }
      else
      {
        outputData[i] = 0;
        outputData[i+1] = 0;
        outputData[i+2] = 0;
      }
      outputData[i + 3] = 255; // alpha
    }
  }

  ctx.putImageData(output, 0, 0);
}
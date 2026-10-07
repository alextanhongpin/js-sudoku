# Sudoku Studio

A static, browser-based Sudoku workspace. Import an image or take a photo on a supported phone, review recognized digits, and solve the puzzle. Recognition runs in the browser with OpenCV.js and Tesseract.js. Low-confidence readings are highlighted for review.

## Run locally

```sh
python3 -m http.server 8080
```

Open http://localhost:8080/. No package installation or build step is required. The first image import downloads OCR code and language data; an internet connection is required. Fonts also load from Google Fonts.

## Publish on GitHub Pages

1. Push the commits to the repository's `master` branch.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
3. Open **Actions → Deploy Sudoku Studio to GitHub Pages → Run workflow** and choose `master` if the initial push ran before Pages was enabled.
4. Wait for the deployment to finish. Subsequent pushes to `master` deploy automatically.

Expected site URL: https://alextanhongpin.github.io/js-sudoku/

The workflow validates JavaScript, packages only `index.html`, `static/`, and `assets/`, and deploys the site with GitHub's Pages actions. Relative asset paths support the repository subdirectory. GitHub Pages supplies HTTPS; there is no backend or server configuration to deploy.

See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Mobile photos

**Take a photo** requests the rear camera through the phone's native image picker. Browser support varies; desktop browsers generally show a file picker. **Browse files** remains available for existing images. Captured photos use the same OCR flow as imported files. Live camera scanning is not implemented.

## Recognition checks

The bundled fixtures were checked through the browser's image picker:

- `assets/images/newspaper.png`: all 25 given digits recognized correctly.
- `assets/images/sudoku.png`: all 26 given digits recognized correctly, including detection without a complete outer border.
- Recognized newspaper puzzle successfully solved; duplicate validation and reset also checked.

Review recognized digits against the original image before solving, especially highlighted cells. Accuracy on other images depends on lighting, focus, angle, and font.

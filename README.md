# Trail Junction

Trail Junction is an offline trail guide in development for #BuildHybridAI 2026. A hiker can use a photo of a marked trail junction to find their place on a downloaded route and recover after a wrong turn.

This first milestone contains the route and matching logic. The bundled Fern Creek Loop is a fictional demo route with five junctions. The mobile-first web app will use Firebase AI Logic to read visible words from a photo, then pass those words to the local junction matcher. A suggested match needs confirmation before it becomes a checkpoint. Recovery directions come from the saved trail connections.

## Run the core tests

Requires Node.js 22.17 or later. Run `npm test` from the repository root. The tests run without a network connection or Firebase credentials.

## License

[Apache License 2.0](LICENSE)

clean:
	echo "Cleaning project"
	rm -rf apps/*/out apps/*/dist apps/extension/webview domain/*/lib infrastructure/*/lib packages/*/public packages/*/dist

install:
	echo "Installing dependencies..."
	pnpm install
	echo "Building project..."
	pnpm build

watch:
	echo "Watching for changes..."
	cd apps/extension && pnpm run watch

build-plantuml-js:
	echo "Building plantuml-js..."
	mkdir -p apps/extension/dist/plantuml-js
	rm -rf apps/extension/dist/plantuml-js/*
	cd packages/plantuml-js && OUTPUT_PATH=../../apps/extension/dist/plantuml-js pnpm run build

build-webview:
	echo "Building webview..."
	cd apps/webview && pnpm run build

build-all: build-plantuml-js build-webview
	echo "Building extension..."
	cd apps/extension && pnpm run compile
	echo "Copying webview build artifacts..."
	mkdir -p apps/extension/webview
	rm -rf apps/extension/webview/*
	cp -r apps/webview/dist/* apps/extension/webview/

cleanBuild:
	echo "Clean building..."
	make clean
	make install
	make setup-nextjs-public-assets


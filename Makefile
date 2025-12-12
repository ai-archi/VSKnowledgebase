clean:
	echo "Cleaning project"
	rm -rf apps/*/out apps/*/dist extension/*/dist domain/*/lib infrastructure/*/lib packages/*/public packages/*/dist

install:
	echo "Installing dependencies..."
	pnpm install
	echo "Building project..."
	pnpm build

watch:
	echo "Watching for changes..."
	cd extension/architool && pnpm run watch

build-webview:
	echo "Building webview..."
	cd packages/webview && pnpm run build

build-all: build-webview
	echo "Building extension..."
	cd extension/architool && pnpm run compile

cleanBuild:
	echo "Clean building..."
	make clean
	make install
	make setup-nextjs-public-assets


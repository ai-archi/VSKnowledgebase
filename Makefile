clean:
	echo "Cleaning project"
	rm -rf apps/*/out apps/*/dist domain/*/lib infrastructure/*/lib

install:
	echo "Installing dependencies..."
	pnpm install
	echo "Building project..."
	pnpm build

watch:
	echo "Watching for changes..."
	cd apps/extension && pnpm run watch

build-webview:
	echo "Building webview..."
	cd apps/webview && pnpm run build

build-all: build-webview
	echo "Building extension..."
	cd apps/extension && pnpm run compile

cleanBuild:
	echo "Clean building..."
	make clean
	make install
	make setup-nextjs-public-assets


.PHONY: build run test clean

BINARY_NAME=bootstrap
BUILD_DIR=bin

build:
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -o $(BUILD_DIR)/$(BINARY_NAME) ./cmd/api/
	cd $(BUILD_DIR) && zip function.zip $(BINARY_NAME)

run:
	go run ./cmd/api/ -local

test:
	go test ./... -v

clean:
	rm -rf $(BUILD_DIR)

# Build stage
FROM golang:alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/api ./cmd/api

# Run stage (Hardened non-root user execution - VULN-13)
FROM alpine:3.20

WORKDIR /app

# Install only minimal necessary runtime dependencies, drop curl and wget
RUN apk --no-cache add ca-certificates tzdata \
    && addgroup -g 10001 -S appgroup \
    && adduser -u 10001 -S appuser -G appgroup

COPY --from=builder /app/api /app/api

USER appuser:appgroup

EXPOSE 8080

CMD ["/app/api"]

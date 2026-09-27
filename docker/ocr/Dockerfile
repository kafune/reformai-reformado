# OCR self-hosted: PaddleOCR 3.x (pipeline OCR com modelos PP-OCRv5), CPU. Ver docs/ocr.md.
# Expõe o serving oficial: POST /ocr { file: base64, fileType: 0|1 } → result.ocrResults[].prunedResult.rec_texts
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 curl && rm -rf /var/lib/apt/lists/*
RUN pip install --upgrade pip && pip install "paddlepaddle==3.2.0" "paddleocr[all]>=3.2" "paddlex[serving]>=3.2"
# Modelo de reconhecimento para português/latim (o padrão do PP-OCRv5 é chinês/inglês/japonês).
COPY ocr.yaml /app/ocr.yaml
WORKDIR /app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=300s --retries=3 CMD curl -fsS http://127.0.0.1:8080/health || exit 1
CMD ["paddlex", "--serve", "--pipeline", "/app/ocr.yaml", "--host", "0.0.0.0", "--port", "8080"]

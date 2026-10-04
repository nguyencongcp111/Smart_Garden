from pathlib import Path
from zipfile import ZipFile
import re


path = Path(__file__).parents[1] / "Bao cao BTL Smart Garden ESP32 DH13C6.docx"
with ZipFile(path) as archive:
    xml_parts = []
    for name in archive.namelist():
        if name.startswith("word/") and name.endswith(".xml"):
            xml_parts.append(archive.read(name).decode("utf-8", errors="ignore"))

raw = "\n".join(xml_parts)
text = re.sub(r"<[^>]+>", " ", raw)
text = re.sub(r"\s+", " ", text)

required = [
    "XÂY DỰNG MÔ HÌNH VƯỜN THÔNG MINH",
    "PHÁT TRIỂN ỨNG DỤNG HỆ THỐNG NHÚNG VÀ IoT",
    "DH13C6",
    "ESP32",
    "DHT11",
    "Soil Moisture",
    "MB370",
    "mạch mở rộng",
    "bộ chuyển đổi",
    "relay 2 kênh",
]
forbidden = [
    "giàn phơi",
    "Arduino Uno",
    "DH13C8",
    "LẬP TRÌNH HỆ THỐNG NHÚNG",
    "Servo SG90",
    "cảm biến mưa",
]

print(f"file={path}")
print(f"size={path.stat().st_size}")
print("required:")
for item in required:
    print(f"  {item}: {item.casefold() in text.casefold()}")
print("forbidden:")
for item in forbidden:
    print(f"  {item}: {item.casefold() in text.casefold()}")


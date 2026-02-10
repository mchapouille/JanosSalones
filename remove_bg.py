from PIL import Image
import sys

def remove_white_background(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # Change all white (also shades of whites)
            # Increased threshold to catch more "off-white" pixels (artifacts)
            # R>200, G>200, B>200 covers light grays too
            if item[0] > 200 and item[1] > 200 and item[2] > 200:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print("Successfully removed background with higher threshold")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    remove_white_background("./app/public/logo.png", "./app/public/logo-v2.png")

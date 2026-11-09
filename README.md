# AeroVisitors
 Home Assistant card to show images of aircraft based on ADSB data.

This card can use either a direct feed from an ADSB source, or a Home Assistant sensor that pulls data from a feed. Many remote feeds won't allow a web page to pull them in, based on CORS configuration, so this handles that by having the Home Assistant sensor read the data.  A rest.yaml configuration file example is shown below.

## Installation

### HACS (recommended)

1. In Home Assistant, open **HACS**.
2. Open the three-dot menu and choose **Custom repositories**.
3. Add `ex247/AeroVisitors` and choose **Dashboard** as the category.
4. Find **AeroVisitors** in HACS and download it.

HACS installs the card and its aircraft artwork together, and registers the dashboard resource automatically. No manual image copying or resource entry is needed.

### Manual installation

1. Copy `aero-visitors-card.js` to `/config/www/aero-visitors-card.js`.
2. Add `/local/aero-visitors-card.js` as a JavaScript module resource.
3. Put aircraft images in `/config/www/aircraft/`, including `cloud.svg`.

Aircraft images should be roughly 1500x100 pixels. Transparent PNGs work best.

The card resolves its default artwork folder relative to its own JavaScript file, so both the HACS and manual layouts work without changing `image_path`.
 
 Images are named by ICAO aircraft type:
   A320.png, B738.png, C172.png
 


## Config Notes
If you configure a Home Assistant weather entity, the background will updated based on conditions. If you configure a Sun sensor, the background will update based on that. The weather sensor is not used to show cloud levels. METAR will provide cloud level information. Most airports have a 4 character METAR code. METAR data is generously provided by Datamask Aviation. [Datamask] ( https://datamask.org/ )  Don't remove their attribution if you use their data.
You can use our own ADSB receiver or a public data source like adsb.lol 
Route data source is configurable, but the parser expects the data to be in the format provided by ADSB.im

The weather (METAR) view gets a messy quickly if there are too many aircraft close together. Work in progress.

## ADSB Sensor Config
```
  - resource: https://api.adsb.lol/v2/lat/40/lon/-70/dist/100
    scan_interval: 600
    timeout: 5
    sensor:
      - name: ADSB Feed LOL
        unique_id: adsb_feed_lol
        value_template: "{{ value_json.ac | length }}"
        json_attributes:
          - now
          - ac
          - msg
 ```
Home Assistant should be configured not to retain the history of this sensor. 
```
recorder:
  exclude:
    entity_globs:
      - sensor.adsb_*
```

## Aircraft Images
Aircraft images are based on the aircraft type code. If no image is available or a type code is not available, a generic shape is used. 
I generated the included images with openAi. The required python file is included so you can adapt it as needed. I have looked at many of the images and used another AI to validate them, but you know how AI is. It will invent things. If there is anything laughably wrong, let me know.

## Views
The Plate view shows one aircraft.
The Cluster view shows all aircraft in a group. They can be scaled to show size differences or all plans can be shown the same size.
The Stacked view shows all aircraft in a vertical stack, sorted by altitude
The Weather view shows all aircraft in a vertical stack, with data from a METAR weather source showing cloud levels. This shows on one screen and will cause planes and descriptions to overlap if there are many aircraft.  METAR data should come from your nearest airport.
  ![av Plate](av-plate-view.png)
   ![av cluster](av-cluster-view.png)
    ![av stacked](av-stacked-view.png)
 ![av weather](av-weather-view.png)

 ## Acknowledgments
 This project was inspired by the amazing work of Ted Warner and his Avian Visitors ( https://github.com/Twarner491/AvianVisitors ) project. And by Tesserae's incredible  e-ink panel solution Tesserae ( https://tesserae.ink/ ).  I did all the design work. AI did all the heavy lifting and much of code typing. 

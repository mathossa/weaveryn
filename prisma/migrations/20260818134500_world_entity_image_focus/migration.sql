ALTER TABLE "WorldEntity"
ADD COLUMN "imageFocusX" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "imageFocusY" INTEGER NOT NULL DEFAULT 50;

ALTER TABLE "WorldEntity"
ADD CONSTRAINT "WorldEntity_image_focus_x_check"
CHECK ("imageFocusX" BETWEEN 0 AND 100);

ALTER TABLE "WorldEntity"
ADD CONSTRAINT "WorldEntity_image_focus_y_check"
CHECK ("imageFocusY" BETWEEN 0 AND 100);

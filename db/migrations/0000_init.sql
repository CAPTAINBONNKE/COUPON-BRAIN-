CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'Tag' NOT NULL,
	"accent" text DEFAULT 'brand' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_categories" (
	"coupon_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "coupon_categories_coupon_id_category_id_pk" PRIMARY KEY("coupon_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "coupon_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"coupon_id" integer,
	"merchant_id" integer,
	"category_id" integer,
	"visitor_id" text NOT NULL,
	"hour_bucket" timestamp with time zone DEFAULT date_trunc('hour', now()) NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_events_type_check" CHECK ("coupon_events"."type" in ('view', 'copy', 'click', 'search', 'merchant_view', 'category_view'))
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coupons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"merchant_id" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"terms" text,
	"kind" text DEFAULT 'code' NOT NULL,
	"code" text,
	"discount_type" text DEFAULT 'percent' NOT NULL,
	"discount_value" numeric(10, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"destination_url" text NOT NULL,
	"image_url" text,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_exclusive" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"copy_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"search_document" text DEFAULT '' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english'::regconfig, coalesce("search_document", ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_kind_check" CHECK ("coupons"."kind" in ('code', 'deal')),
	CONSTRAINT "coupons_discount_type_check" CHECK ("coupons"."discount_type" in ('percent', 'fixed', 'shipping', 'bogo', 'other')),
	CONSTRAINT "coupons_discount_value_check" CHECK ("coupons"."discount_value" is null or "coupons"."discount_value" >= 0),
	CONSTRAINT "coupons_code_present_check" CHECK (("coupons"."kind" = 'deal') or ("coupons"."code" is not null and length(btrim("coupons"."code")) > 0)),
	CONSTRAINT "coupons_date_order_check" CHECK ("coupons"."starts_at" is null or "coupons"."expires_at" is null or "coupons"."starts_at" < "coupons"."expires_at")
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "merchants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"website_url" text NOT NULL,
	"affiliate_url" text,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"brand_color" text,
	"country" text DEFAULT 'Global' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupon_categories" ADD CONSTRAINT "coupon_categories_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_categories" ADD CONSTRAINT "coupon_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_events" ADD CONSTRAINT "coupon_events_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_events" ADD CONSTRAINT "coupon_events_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_events" ADD CONSTRAINT "coupon_events_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_key" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_sort_idx" ON "categories" USING btree ("sort_order","name");--> statement-breakpoint
CREATE INDEX "categories_name_prefix_idx" ON "categories" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "coupon_categories_category_idx" ON "coupon_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "coupon_events_coupon_type_time_idx" ON "coupon_events" USING btree ("coupon_id","type","created_at");--> statement-breakpoint
CREATE INDEX "coupon_events_type_time_idx" ON "coupon_events" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "coupon_events_merchant_time_idx" ON "coupon_events" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_events_dedupe_idx" ON "coupon_events" USING btree ("coupon_id","visitor_id","type","hour_bucket");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_slug_key" ON "coupons" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "coupons_merchant_created_idx" ON "coupons" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "coupons_created_idx" ON "coupons" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "coupons_expires_idx" ON "coupons" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "coupons_starts_idx" ON "coupons" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "coupons_disabled_idx" ON "coupons" USING btree ("is_disabled");--> statement-breakpoint
CREATE INDEX "coupons_featured_idx" ON "coupons" USING btree ("is_featured","created_at");--> statement-breakpoint
CREATE INDEX "coupons_verified_idx" ON "coupons" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "coupons_click_count_idx" ON "coupons" USING btree ("click_count");--> statement-breakpoint
CREATE INDEX "coupons_copy_count_idx" ON "coupons" USING btree ("copy_count");--> statement-breakpoint
CREATE INDEX "coupons_value_idx" ON "coupons" USING btree ("discount_type","discount_value");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_merchant_code_key" ON "coupons" USING btree ("merchant_id","code");--> statement-breakpoint
CREATE INDEX "coupons_search_idx" ON "coupons" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_slug_key" ON "merchants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "merchants_featured_idx" ON "merchants" USING btree ("is_featured","name");--> statement-breakpoint
CREATE INDEX "merchants_name_prefix_idx" ON "merchants" USING btree (lower("name"));